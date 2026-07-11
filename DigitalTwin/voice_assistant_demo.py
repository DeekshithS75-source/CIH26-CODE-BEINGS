import os
import time
import requests
import json
import subprocess

# Setup standard libraries for audio recording
try:
    import sounddevice as sd
    import soundfile as sf
    import numpy as np
    HAS_AUDIO_LIBS = True
except ImportError:
    HAS_AUDIO_LIBS = False

# Setup Whisper
try:
    import whisper
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False

# ==========================================
# CONFIGURATION
# ==========================================
BACKEND_URL = "http://localhost:3001"
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen3:4b" 
AUDIO_FILE = "farmer_query.wav"

def check_services():
    """Verify Express backend is online."""
    print("\n[System Check] Checking local dependencies...")
    try:
        res = requests.get(f"{BACKEND_URL}/api/farm-data/all")
        if res.status_code == 200:
            print("  - Express Digital Twin: ONLINE")
            return True
    except requests.exceptions.ConnectionError:
        print("  - Express Digital Twin: OFFLINE (Please run 'npm start' in backend!)")
        return False
    return False

def record_audio(duration=5, fs=16000):
    """Records audio from laptop microphone"""
    if not HAS_AUDIO_LIBS:
        print("\n[Audio] Audio libraries not found. Run: pip install sounddevice soundfile numpy")
        return False
        
    print(f"\n[Microphone] Recording started... Speak now for {duration} seconds.")
    print("  >> Ask about crop health, diseases, or weather (English/Malayalam/Kannada) <<")
    
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='float32')
    sd.wait()
    
    sf.write(AUDIO_FILE, recording, fs)
    print(f"[Microphone] Recording saved to: {AUDIO_FILE}")
    return True

def transcribe_audio():
    """Transcribes audio using local Whisper model"""
    if not HAS_WHISPER:
        print("\n[AI STT] Whisper library not found. Run: pip install openai-whisper")
        return input("\n[Keyboard Fallback] Enter your question: ")
        
    print("\n[AI STT] Loading Whisper model (base)... (This runs 100% locally)")
    model = whisper.load_model("base")
    
    print("[AI STT] Transcribing audio file (Loading via Soundfile to bypass ffmpeg dependency)...")
    
    try:
        audio_data, samplerate = sf.read(AUDIO_FILE)
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
        audio_data = audio_data.astype(np.float32)
        
        result = model.transcribe(audio_data, fp16=False)
        text = result["text"].strip()
        print(f"[AI STT] Transcribed Text: \"{text}\"")
        return text
    except Exception as e:
        print(f"[AI STT ERROR] Failed to load audio: {e}")
        return input("\n[Keyboard Fallback] Enter your question: ")

def detect_language(text):
    """Detects if query is in Malayalam, Kannada or English"""
    has_malayalam = any('\u0d00' <= char <= '\u0d7f' for char in text)
    has_kannada = any('\u0c80' <= char <= '\u0cff' for char in text)
    
    ml_keywords = ["തക്കാളി", "വെള്ളം", "രോഗം", "കാലാവസ്ഥ", "മേഖല", "ചെടി", "എങ്ങനെ"]
    kn_keywords = ["ಬೆಳೆ", "ನೀರು", "ರೋಗ", "ಹೇಗಿದೆ", "ವಲಯ", "ಕೃಷಿ", "ತಾಪಮಾನ"]
    
    text_lower = text.lower()
    if has_malayalam or any(k in text_lower for k in ml_keywords):
        return "ml"
    elif has_kannada or any(k in text_lower for k in kn_keywords):
        return "kn"
    return "en"

def speak_text(text, lang):
    """Speaks the response text out loud 100% LOCALLY and OFFLINE on Windows"""
    print(f"\n[Text-to-Speech] Speaking output locally in {lang}...")
    
    # Built-in Windows Speech Synthesizer (100% offline, 0 RAM overhead)
    if os.name == 'nt':
        safe_text = text.replace("'", "").replace('"', "").replace("\n", " ")
        ps_command = f"Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('{safe_text}')"
        subprocess.run(["powershell", "-Command", ps_command], capture_output=True)
    else:
        # macOS / Linux built-in speech engine
        subprocess.run(["say", text])

def generate_nlg_response(zone, weather, lang, question):
    """Generates highly realistic, targeted agronomist responses based on question intent"""
    crop = zone['crop']
    soil = zone['soil_moisture']
    temp = zone['temperature']
    hum = zone['humidity']
    sprinkler = zone['irrigation']
    
    # Detect Intent based on keywords
    question_lower = question.lower()
    
    # Weather/Climate keywords
    weather_keys = ["weather", "climate", "temp", "temperature", "rain", "hot", "cold", "കാലാവസ്ഥ", "ചൂട്", "തണുപ്പ്", "മഴ", "ಹವಾಮಾನ", "ತಾಪಮಾನ", "ಮಳೆ"]
    # Water/Irrigation keywords
    water_keys = ["water", "irrigate", "sprinkler", "wet", "dry", "moisture", "വെള്ളം", "നനയ്ക്കുക", "ഈർപ്പം", "നീರು", "ತೇವಾಂಶ"]
    # Disease/Health keywords
    disease_keys = ["disease", "health", "sick", "fungus", "pest", "safe", "രോഗം", "ചെടി", "കേട്", "സുരക്ഷിതം", "ಬೆಳೆ", "ರೋಗ", "ಉಪದ್ರವ", "ಸುರಕ್ಷಿತ"]
    
    intent = "SUMMARY" # Default general report
    if any(k in question_lower for k in weather_keys):
        intent = "WEATHER"
    elif any(k in question_lower for k in water_keys):
        intent = "WATER"
    elif any(k in question_lower for k in disease_keys):
        intent = "DISEASE"

    print(f"[NLG Engine] Detected Intent: {intent}")

    moisture_status = "CRITICAL_DRY" if soil < 35 else ("SATURATED" if soil > 70 else "HEALTHY")
    disease_risk = "HIGH" if (temp > 35 or hum > 80) else "LOW"
    
    if lang == "ml": # Malayalam Response
        if intent == "WEATHER":
            return f"ഇപ്പോഴത്തെ കാലാവസ്ഥ {weather['condition']} ആണ്. അന്തരീക്ഷ ഊഷ്മാവ് {temp} ഡിഗ്രി രേഖപ്പെടുത്തിയിട്ടുണ്ട്."
            
        elif intent == "WATER":
            status_text = "വളരെ കുറവാണ്" if moisture_status == "CRITICAL_DRY" else ("വളരെ കൂടുതലാണ്" if moisture_status == "SATURATED" else "ആവശ്യത്തിനുണ്ട്")
            sprinkler_text = "ഓട്ടോമാറ്റിക് സ്പ്രിംഗ്ലർ ഇപ്പോൾ ഓൺ ആണ്." if sprinkler else "സ്പ്രിംഗ്ലർ പമ്പുകൾ ഇപ്പോൾ ഓഫ് ആണ്."
            return f"മണ്ണിലെ ഈർപ്പം {soil} ശതമാനം ആണ്. ഇത് വിളകൾക്ക് {status_text}. {sprinkler_text}"
            
        elif intent == "DISEASE":
            risk_text = "വളരെ കൂടുതലാണ്. ഇലകൾ ചീയുന്നതിനെതിരെ പ്രതിരോധ നടപടികൾ എടുക്കുക." if disease_risk == "HIGH" else "വളരെ കുറവാണ്. വിളകൾ സുരക്ഷിതമാണ്."
            return f"ചൂടും ഈർപ്പവും വിലയിരുത്തുമ്പോൾ വിളകൾക്ക് രോഗബാധ ഉണ്ടാകാനുള്ള സാധ്യത {risk_text}"
            
        else: # SUMMARY
            crop_advice = f"മേഖല എ ലെ {crop} വിളകൾ വരണ്ട അവസ്ഥയിലാണ്. മണ്ണിലെ ഈർപ്പം {soil} ശതമാനം ആണ്." if moisture_status == "CRITICAL_DRY" else f"വിളകൾ ആരോഗ്യത്തോടെയിരിക്കുന്നു. ഈർപ്പം {soil} ശതമാനം ആണ്."
            action_advice = "ഓട്ടോമാറ്റിക് സ്പ്രിംഗ്ലർ ഇപ്പോൾ പ്രവർത്തിക്കുന്നുണ്ട്." if sprinkler else "വാൽവ് ഇപ്പോൾ ഓഫ് ആണ്."
            return f"{crop_advice} {action_advice}"
        
    elif lang == "kn": # Kannada Response
        if intent == "WEATHER":
            return f"ಸದ್ಯದ ಹವಾಮಾನವು {weather['condition']} ಆಗಿದೆ. ತಾಪಮಾನವು {temp} ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್ ದಾಖಲಾಗಿದೆ."
            
        elif intent == "WATER":
            status_text = "ಅತ್ಯಂತ ಕಡಿಮೆಯಿದೆ" if moisture_status == "CRITICAL_DRY" else ("ಅತಿಯಾಗಿದೆ" if moisture_status == "SATURATED" else "ಸೂಕ್ತವಾಗಿದೆ")
            sprinkler_text = "ಸ್ಪ್ರಿಂಕ್ಲರ್ ಪಂಪ್ ಈಗ ಚಾಲನೆಯಲ್ಲಿದೆ." if sprinkler else "ಸ್ಪ್ರಿಂಕ್ಲರ್ ವಾಲ್ವ್ ಈಗ ಬಂದ್ ಆಗಿದೆ."
            return f"ಮಣ್ಣಿನ ತೇವಾಂಶವು {soil} ಶೇಕಡಾ ಆಗಿದೆ. ಇದು ಬೆಳೆಗಳಿಗೆ {status_text}. {sprinkler_text}"
            
        elif intent == "DISEASE":
            risk_text = "ಹೆಚ್ಚಾಗಿದೆ. ಶಿಲೀಂಧ್ರ ಹರಡದಂತೆ ಮುನ್ನೆಚ್ಚರಿಕೆ ವಹಿಸಿ." if disease_risk == "HIGH" else "ಅತ್ಯಂತ ಕಡಿಮೆಯಿದೆ. ಬೆಳೆಗಳು ಸುರಕ್ಷಿತವಾಗಿವೆ."
            return f"ತಾಪಮಾನ ಮತ್ತು ಆರ್ದ್ರತೆಯ ಆಧಾರದ ಮೇಲೆ ಬೆಳೆಗಳಿಗೆ ರೋಗ ತಗಲುವ ಅಪಾಯ {risk_text}"
            
        else: # SUMMARY
            crop_advice = f"ವಲಯ ಎ ನಲ್ಲಿರುವ {crop} ಬೆಳೆ ಒಣಗುತ್ತಿದೆ. ಮಣ್ಣಿನ ತೇವಾಂಶ {soil} ಶೇಕಡಾ ಆಗಿದೆ." if moisture_status == "CRITICAL_DRY" else f"ಬೆಳೆಗಳು ಆರೋಗ್ಯಕರವಾಗಿದ್ದು, ಮಣ್ಣಿನ ತೇವಾಂಶ ಸೂಕ್ತವಾಗಿದೆ ({soil}%)."
            action_advice = "ಸ್ಪ್ರಿಂಕ್ಲರ್ ಪಂಪ್ ಈಗ ಚಾಲನೆಯಲ್ಲಿದೆ." if sprinkler else "ಸ್ಪ್ರಿಂಕ್ಲರ್ ವಾಲ್ವ್ ಈಗ ಬಂದ್ ಆಗಿದೆ."
            return f"{crop_advice} {action_advice}"
        
    else: # English Response
        if intent == "WEATHER":
            return f"The current weather conditions are {weather['condition']}. The local temperature is {temp} degrees."
            
        elif intent == "WATER":
            status_text = "critically dry" if moisture_status == "CRITICAL_DRY" else ("waterlogged" if moisture_status == "SATURATED" else "optimal")
            sprinkler_text = "The automated sprinkler pump is active." if sprinkler else "The irrigation system is standby."
            return f"Soil moisture is {soil} percent, which is {status_text} for your {crop}. {sprinkler_text}"
            
        elif intent == "DISEASE":
            risk_text = "high risk of fungal pathogens. Check crop leaves for spots." if disease_risk == "HIGH" else "low risk. Crop leaves show normal chlorophyll health."
            return f"Based on temperature ({temp}C) and humidity ({hum}%), there is a {risk_text}"
            
        else: # SUMMARY
            crop_advice = f"Your {crop} crop is water-stressed with critical {soil} percent moisture." if moisture_status == "CRITICAL_DRY" else f"Your {crop} crop is healthy, and the soil moisture is stable at {soil} percent."
            action_advice = "The automated sprinkler pump is active." if sprinkler else "The irrigation system is standby."
            return f"{crop_advice} {action_advice}"

def fetch_farm_context():
    """Retrieves live sensor data from local Digital Twin backend"""
    try:
        res = requests.get(f"{BACKEND_URL}/api/farm-data/all")
        data = res.json()
        zone = data["zones"][0] # Zone A
        weather = data["weather"]
        time_of_day = data["simulation_time"]
        return zone, weather, time_of_day
    except Exception as e:
        print(f"[Context ERROR] Failed to fetch digital twin state: {e}")
        return None, None, None

def query_ollama(question, context_str):
    """Feeds question into local Ollama LLM with streaming. Returns None if it fails."""
    prompt = f"""
You are a helpful, professional AI Agronomist chatbot. 
Analyze the live sensor data of the farm and answer the farmer's question.
If the farmer asks in Malayalam, reply in Malayalam.
If the farmer asks in Kannada, reply in Kannada.
Otherwise, reply in English.
IMPORTANT: Respond immediately and directly with the final answer. Do NOT output any thinking, reasoning, or `<think>` tags.
Keep your response concise (maximum 3 sentences) and highly practical.

{context_str}

Farmer Question: "{question}"
AI Agronomist Answer:"""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": True
    }

    try:
        print(f"\n[AI LLM] Attempting local Ollama model '{OLLAMA_MODEL}'...")
        response = requests.post(OLLAMA_URL, json=payload, stream=True, timeout=5)
        
        if response.status_code != 200:
            return None
            
        full_response = ""
        for line in response.iter_lines():
            if line:
                chunk = json.loads(line.decode('utf-8'))
                if "error" in chunk:
                    return None
                token = chunk.get("response", "")
                print(token, end="", flush=True)
                full_response += token
        print()
        return full_response.strip()
    except Exception:
        return None

def main():
    print("==================================================================")
    print("  MULTILINGUAL LOCAL CROP ASSISTANT (WHISPER + VOICE FEEDBACK)")
    print("==================================================================")
    
    if not check_services():
        print("\n❌ Setup incomplete. Please start the Express server.")
        return

    # 1. Capture Audio
    recorded = False
    if HAS_AUDIO_LIBS:
        recorded = record_audio(duration=5)
    else:
        print("\n[Microphone] Missing sounddevice package, defaulting to keyboard mode.")

    # 2. Transcribe
    if recorded:
        question = transcribe_audio()
    else:
        question = input("\n[Keyboard Input] Enter your question: ")

    if not question:
        print("No input detected. Exiting.")
        return

    # 3. Ingest Twin Context
    zone, weather, time_of_day = fetch_farm_context()
    if not zone:
        print("Error: Could not retrieve digital twin farm data.")
        return
        
    context_str = f"""
Current Farm State:
- Crop Type: {zone['crop']} (Zone {zone['zone_id']})
- Soil Moisture: {zone['soil_moisture']}%
- Local Temperature: {zone['temperature']} C
- Relative Humidity: {zone['humidity']}%
- Irrigation State: {zone['irrigation']}
- Active Warning: {zone['alert']}
- General Climate: {weather['condition']}
"""
    print("\n--- Live Farm Data Ingested ---")
    print(context_str.strip())
    print("-------------------------------")

    # 4. Detect Language spoken
    lang = detect_language(question)
    lang_names = {"en": "English", "ml": "Malayalam", "kn": "Kannada"}
    print(f"[Language Detector] Detected language: {lang_names[lang]}")

    # 5. Get Answer (Try Ollama first, fallback to native NLG if offline/crashes)
    print("\n==================================================================")
    print(" AI AGRONOMIST RESPONSE:")
    print("==================================================================")
    
    # Try local LLM
    response_text = query_ollama(question, context_str)
    
    # Fallback to local NLG if Ollama fails or crashes
    if not response_text:
        print("[System Info] Ollama unavailable. Triggering local NLG Engine...")
        response_text = generate_nlg_response(zone, weather, lang, question)
        print(response_text)
        
    print("==================================================================")

    # 6. Speak output out loud!
    speak_text(response_text, lang)

if __name__ == "__main__":
    main()
