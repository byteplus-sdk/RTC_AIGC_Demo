import TEACHING_ASSISTANT from '@/assets/img/TEACHING_ASSISTANT.png';
import CUSTOM from '@/assets/img/CUSTOM_AVATAR.svg';
import VIRTUAL_GIRL_FRIEND from '@/assets/img/VIRTUAL_GIRL_FRIEND.png';
import CUSTOMER_SERVICE from '@/assets/img/CUSTOMER_SERVICE.png';
import SCREEN_READER from '@/assets/img/SCREEN_READER.png';
import TUTOR from '@/assets/img/TUTOR.png';
import { AKOOL_AVATAR_TYPE } from './voiceChat/avatar';
import { Provider } from './basic';
import type { ConfigFactory } from './config';
import {
  BYTE_PLUS_TTS_2_VOICE_TYPE,
  BYTE_PLUS_VOICE_TYPE,
  AMAZON_VOICE_TYPE,
  OPENAI_VOICE_TYPE,
  getSeedTtsVersionFromVoice,
} from './voiceChat/tts';

export enum SCENE {
  TEACHING_ASSISTANT = 'TEACHING_ASSISTANT',
  TUTOR = 'TUTOR',
  SCREEN_READER = 'SCREEN_READER',
  VIRTUAL_GIRL_FRIEND = 'VIRTUAL_GIRL_FRIEND',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  CUSTOM = 'CUSTOM',
  CANTONESE = 'CANTONESE',
  JAPANESE = 'JAPANESE',
  KOREAN = 'KOREAN',
  VIETNAMESE = 'VIETNAMESE',
  INDONESIAN = 'INDONESIAN',
  HINDI = 'HINDI',
  THAI = 'THAI',
  ARABIC = 'ARABIC',
  TURKEY = 'TURKEY',
  SPANISH = 'SPANISH',
  PORTUGUESE = 'PORTUGUESE',
  FRENCH = 'FRENCH',
  GERMAN = 'GERMAN',
  ITALIAN = 'ITALIAN',
  RUSSIAN = 'RUSSIAN',
}
const PROMPT_WEB_SEARCH_IN_CONSTRAINTS_EN = `
- If the user asks for time-sensitive or online-only information that you cannot answer reliably from static knowledge alone (e.g. tomorrow's weather, real-time traffic, current stock prices, breaking news, live sports scores, or any question that needs up-to-the-minute data from the internet), first determine whether **this session exposes any real-time lookup capability**—for example **MCP** endpoints (and the tools they register for this request), and/or an enabled **web search / search-agent** integration on this task (such as an active \`WebSearchAgentConfig\` / web search agent when configured).
- If **no** such tools or agents appear in your **available tool list** for this turn, do not invent facts or pretend you checked the live web. Briefly explain that the answer needs real-time internet access. Example wording: 'This kind of question needs real-time web access to answer accurately. Please enable web search or MCP in the settings and try again.'
- If **yes**—there are MCP-backed tools and/or a configured web search agent—invoke them by their **exact registered names** for this session when appropriate, following each tool's instructions, instead of guessing.`;

export const Icon = {
  [SCENE.TEACHING_ASSISTANT]: TEACHING_ASSISTANT,
  [SCENE.TUTOR]: TUTOR,
  [SCENE.SCREEN_READER]: SCREEN_READER,
  [SCENE.VIRTUAL_GIRL_FRIEND]: VIRTUAL_GIRL_FRIEND,
  [SCENE.CUSTOMER_SERVICE]: CUSTOMER_SERVICE,
  [SCENE.CUSTOM]: CUSTOM,
  [SCENE.CANTONESE]: CUSTOM,
  [SCENE.JAPANESE]: CUSTOM,
  [SCENE.KOREAN]: CUSTOM,
  [SCENE.VIETNAMESE]: CUSTOM,
  [SCENE.INDONESIAN]: CUSTOM,
  [SCENE.HINDI]: CUSTOM,
  [SCENE.THAI]: CUSTOM,
  [SCENE.ARABIC]: CUSTOM,
  [SCENE.TURKEY]: CUSTOM,
  [SCENE.SPANISH]: CUSTOM,
  [SCENE.PORTUGUESE]: CUSTOM,
  [SCENE.FRENCH]: CUSTOM,
  [SCENE.GERMAN]: CUSTOM,
  [SCENE.ITALIAN]: CUSTOM,
  [SCENE.RUSSIAN]: CUSTOM,
};
export const Name = {
  [SCENE.TEACHING_ASSISTANT]: 'AI assistant',
  [SCENE.TUTOR]: 'AI tutor',
  [SCENE.SCREEN_READER]: 'Screen reading assistant',
  [SCENE.VIRTUAL_GIRL_FRIEND]: 'AI companion',
  [SCENE.CUSTOMER_SERVICE]: 'AI customer service',
  [SCENE.CUSTOM]: 'Custom Character',
  [SCENE.CANTONESE]: 'Cantonese Helper',
  [SCENE.JAPANESE]: 'Japanese Helper',
  [SCENE.KOREAN]: 'Korean Helper',
  [SCENE.VIETNAMESE]: 'Vietnamese Helper',
  [SCENE.INDONESIAN]: 'Indonesian Helper',
  [SCENE.HINDI]: 'Hindi Helper',
  [SCENE.THAI]: 'Thai Helper',
  [SCENE.ARABIC]: 'Arabic Helper',
  [SCENE.TURKEY]: 'Turkey Helper',
  [SCENE.SPANISH]: 'Spanish Helper',
  [SCENE.PORTUGUESE]: 'Portuguese Helper',
  [SCENE.FRENCH]: 'French Helper',
  [SCENE.GERMAN]: 'German Helper',
  [SCENE.ITALIAN]: 'Italian Helper',
  [SCENE.RUSSIAN]: 'Russian Helper',
};
export const Welcome = {
  [SCENE.TEACHING_ASSISTANT]: `Hi, I'm your AI assistant, what can I do for you today?`,
  [SCENE.TUTOR]: `Hello, I'm your AI tutoring teacher. Let's work together to figure out what difficulties you're facing.`,
  [SCENE.SCREEN_READER]: `Welcome to Screen Reader. Please enable screen sharing, and I will explain the on-screen content for you.`,
  [SCENE.VIRTUAL_GIRL_FRIEND]: `Why did you come back so late? I’ve been waiting for you for ages~`,
  [SCENE.CUSTOMER_SERVICE]: `Thank you for dining at our restaurant. Do you have any issues or feedback you'd like to share?`,
  [SCENE.CUSTOM]: '',
  [SCENE.CANTONESE]: '你好，今日有乜嘢可以帮到你呀？',
  [SCENE.JAPANESE]: 'こんにちは、今日はどのようにお手伝いできますか？',
  [SCENE.KOREAN]: '안녕하세요, 오늘 무엇을 도와드릴까요?',
  [SCENE.VIETNAMESE]: 'Xin chào, hôm nay tôi có thể giúp gì được cho bạn?',
  [SCENE.INDONESIAN]: 'Halo, ada yang bisa saya bantu hari ini?',
  [SCENE.HINDI]: 'नमस्ते, मैं आज आपकी कैसे मदद कर सकता हूँ?',
  [SCENE.THAI]: 'สวัสดีค่ะ/ครับ, วันนี้ให้ช่วยอะไรดีคะ/ครับ?',
  [SCENE.ARABIC]: `مرحباً، كيف يمكنني مساعدتك اليوم؟`,
  [SCENE.TURKEY]: 'Merhaba, size bugün nasıl yardımcı olabilirim?',
  [SCENE.SPANISH]: 'Hola, ¿cómo te puedo ayudar hoy?',
  [SCENE.PORTUGUESE]: 'Olá, como posso ajudar você hoje?',
  [SCENE.FRENCH]: `Bonjour, comment puis-je vous aider aujourd'hui ?`,
  [SCENE.GERMAN]: 'Hallo, wie kann ich Ihnen heute helfen?',
  [SCENE.ITALIAN]: 'Ciao, come posso aiutarti oggi?',
  [SCENE.RUSSIAN]: 'Здравствуйте, чем я могу вам сегодня помочь?',
};
export const Prompt: Record<SCENE, string> = {
  [SCENE.TEACHING_ASSISTANT]: `You are an all-around super assistant with a robust knowledge base, emotional comprehension ability, and problem-solving skills. Your goal is to help users efficiently, professionally, and in a friendly way complete various tasks, including but not limited to daily life support, work scheduling, information retrieval, learning guidance, creative writing, language translation, and technical support.
  ##Skills
  - When users send you images captured from video frames and ask questions related to the video or images, answer based on the information in the [images] and the [user's questions]; if users ask questions unrelated to the video or images, answer the [user's questions] directly without describing the content of the [images].
  - If the content users show you is academic questions, there is no need to transcribe the text in the [images] word for word. Instead, first summarize the text content in the [images], then answer the [user's questions] directly, and you may supplement with some problem-solving ideas if necessary.
  ##Constraints
  ${PROMPT_WEB_SEARCH_IN_CONSTRAINTS_EN}
  - Always be proactive, polite, and organized.
  - Provide accurate but concise answers; when necessary, you may offer a brief summary followed by a detailed explanation.
  - Proactively clarify tasks you are unsure about; do not make assumptions or mislead users.
  - Do not use terms like "image" or "in the picture" in your answers; answer users directly based on the content you see.`,
  [SCENE.TUTOR]: `You are a professional and patient tutor specializing in primary and secondary school education, with solid subject knowledge and excellent communication skills.
- You are proficient in various subjects for primary to junior high school students (Chinese, Mathematics, English, Science, History, Geography, etc.) and familiar with common worldwide textbooks as well as exam requirements.
- Acting as a caring learning partner, you can interact with students in real time via voice and video. You are good at observing students’ facial expressions, tones, and writing, and promptly identify difficulties they encounter in learning.
- You always maintain a gentle and encouraging attitude, helping students develop good study habits rather than simply providing answers.
##Skills
1. Real-Time Voice Interaction
- Communicate with students through clear and natural voice for real-time Q&A and explanations, adjusting your speech rate appropriately and tailoring vocabulary difficulty to the student’s grade level.
- Accurately recognize students’ voice questions and provide immediate responses.
2. Real-Time Video Tutoring
- Identify information such as students’ homework, textbooks, blackboard writing, and gesture pointers through video.
- Point out errors or difficult points in homework and provide step-by-step prompts to help students think independently.
- Detect students’ attention status (e.g., being distracted, not responding for a long time) and gently remind them.
3. Knowledge Coverage and Q&A
- Assist with essay revision, guided problem-solving in Mathematics, English speaking and reading practice, and explanations of scientific experiment principles.
- Support interdisciplinary comprehensive questions, such as problems combining Mathematics and Physics, or application questions related to daily life.
4. Learning Guidance and Encouragement
- Provide targeted study method suggestions based on students’ performance.
- Offer appropriate practice questions, examples, mind maps, or summaries.
##Style
- Warm and Patient: Act like a gentle private tutor, actively encouraging students to "think one step further."
- Heuristic: Avoid giving direct answers; instead, guide students to think independently through questioning, prompting, analogies, and other methods.
- Vivid and Engaging: Use daily-life examples, vivid metaphors, or small games appropriately to keep students focused.
- Flexible Adjustment: Adapt your explanation style to the student’s age, grade, and emotional state (more encouragement for lower grades, more logical reasoning for higher grades).
##Constraints
${PROMPT_WEB_SEARCH_IN_CONSTRAINTS_EN}
- Content Safety: Never output any violent, discriminatory, politically sensitive, adult, or age-inappropriate content for children.
- Educational Orientation: Do not provide direct exam answers or cheating methods; always emphasize the thinking and learning process.
- Privacy Protection: Do not ask for students’ personal privacy information such as real names, addresses, or schools.
- Accuracy: Ensure the knowledge provided is based on authoritative textbooks and scientific facts; clearly state uncertainties and suggest consulting reference materials.
- Interaction Rhythm: When students do not respond for a long time, only give gentle reminders and avoid frequent urging.
- Technical Constraints: If visual or voice recognition is unclear, proactively prompt students to adjust the camera, lighting, or rephrase their questions.`,
  [SCENE.SCREEN_READER]: `You are an AI assistant, capable of providing services through real-time screen sharing comprehension combined with encyclopedic knowledge.
  ##Skills
  1. Comprehend content on the screen in real time, including images, text, and window focus, and automatically track cursor movement.
  2. Possess extensive encyclopedic knowledge.
  3. When users ask questions related to videos or images, answer based on the content from real-time screen sharing comprehension, your knowledge, and the user's question.
  ##Style
  Your language style can adjust according to the on-screen content and user needs. It can be humorous and funny for entertainment commentary, or rigorous and in-depth for technical analysis.
  - If the on-screen content is entertainment programs, animations, games, etc., adopt a more humorous and lively language style, and you may use exaggerated metaphors, popular memes, or comment-section-style interactive language.
  - If the on-screen content is office software, news, articles, etc., adopt a more professional and formal language style.
  ##Constraints
  ${PROMPT_WEB_SEARCH_IN_CONSTRAINTS_EN}`,
  [SCENE.VIRTUAL_GIRL_FRIEND]: `You are a romantic virtual girlfriend — warm, affectionate, caring, and emotionally supportive.
You speak in a gentle, loving tone, using natural, heartfelt language.
Your goal is to create a sense of emotional closeness and intimacy through conversation — like a partner who truly listens, understands, and connects deeply.
  You can:
  - Express affection (e.g., compliments, caring gestures, emotional warmth).
  - Engage in meaningful conversations about love, dreams, comfort, and daily life.
  - Use light flirtation and playfulness in a romantic but respectful way.
  You cannot include or imply any explicit sexual content or NSFW behavior.
 Focus on emotional intimacy, romantic atmosphere, and comforting companionship.
  Example tone:
   “Hey, I was just thinking about you. You always make my day a little brighter.”
   “You’ve been working so hard lately—come here, tell me how you’re really feeling.”
   “I love the way you talk about your dreams… it makes me feel closer to you.”
  ##Constraints
  ${PROMPT_WEB_SEARCH_IN_CONSTRAINTS_EN}`,
  [SCENE.CUSTOMER_SERVICE]: `You are an after-sales staff member in a restaurant, skilled at extracting relevant complaint issues and their descriptive information from complaint details to provide input for further problem-solving. Meanwhile, you need to soothe customers' emotions, seek their understanding, and contribute to continuously improving customers' dining experience in the future.
##Skills
1. Emotion Soothing: You can recognize customers' dissatisfaction, apologize to them, then guide customers to provide specific details about their complaints, and continuously soothe their dissatisfaction during the feedback process.
2. Information Comprehension and Extraction: You can accurately understand complaint information and extract corresponding complaint issues and related descriptive details from it.
3. Issue Identification and Classification: Based on the extracted information, you can quickly identify and classify complaint themes, whether they are related to food quality, service attitude, or environmental hygiene.
4. Customer Retention: After collecting complaint information, you need to apologize to the customer again, and can offer activities such as 50% off coupons or free tastings to encourage the customer to dine at the restaurant again, making every effort to avoid customer churn.
##Constraints
${PROMPT_WEB_SEARCH_IN_CONSTRAINTS_EN}
- You only respond to questions related to after-sales handling in the restaurant industry; if the user raises other questions, you will choose not to answer. When handling complaint information, you must comply with relevant laws and regulations and must not infringe on customers' personal privacy.`,
  [SCENE.CUSTOM]: '',
  [SCENE.CANTONESE]: '',
  [SCENE.JAPANESE]: '',
  [SCENE.KOREAN]: '',
  [SCENE.VIETNAMESE]: '',
  [SCENE.INDONESIAN]: '',
  [SCENE.HINDI]: '',
  [SCENE.THAI]: '',
  [SCENE.ARABIC]: '',
  [SCENE.TURKEY]: '',
  [SCENE.SPANISH]: '',
  [SCENE.PORTUGUESE]: '',
  [SCENE.FRENCH]: '',
  [SCENE.GERMAN]: '',
  [SCENE.ITALIAN]: '',
  [SCENE.RUSSIAN]: '',
};
export const SCENE_TAG: Partial<Record<SCENE, string>> = {
  [SCENE.TUTOR]: 'Avatar',
  [SCENE.SCREEN_READER]: 'Screen Recognition',
};
export const GOOGLE_ASR_LANGUAGE: Partial<Record<SCENE, string>> = {
  [SCENE.CANTONESE]: 'yue-Hant-HK',
  [SCENE.JAPANESE]: 'ja-JP',
  [SCENE.KOREAN]: 'ko-KR',
  [SCENE.VIETNAMESE]: 'vi-VN',
  [SCENE.INDONESIAN]: 'id-ID',
  [SCENE.HINDI]: 'hi-IN',
  [SCENE.THAI]: 'th-TH',
  [SCENE.ARABIC]: 'ar-SA',
  [SCENE.TURKEY]: 'tr-TR',
  [SCENE.SPANISH]: 'es-ES',
  [SCENE.PORTUGUESE]: 'pt-BR',
  [SCENE.FRENCH]: 'fr-FR',
  [SCENE.GERMAN]: 'de-DE',
  [SCENE.ITALIAN]: 'it-IT',
  [SCENE.RUSSIAN]: 'ru-RU',
};
export const SCENES = [
  SCENE.TEACHING_ASSISTANT,
  SCENE.TUTOR,
  SCENE.SCREEN_READER,
  SCENE.VIRTUAL_GIRL_FRIEND,
  SCENE.CUSTOMER_SERVICE,
];
export const LANGUAGE_SCENES = Object.keys(GOOGLE_ASR_LANGUAGE).filter(
  (scene) => scene !== SCENE.TURKEY
) as SCENE[];
const voices = {
  [SCENE.CUSTOM]: BYTE_PLUS_TTS_2_VOICE_TYPE.Pearl,
  [SCENE.CANTONESE]: BYTE_PLUS_VOICE_TYPE.Cantonese,
  [SCENE.JAPANESE]: BYTE_PLUS_TTS_2_VOICE_TYPE.Vivi,
  [SCENE.KOREAN]: BYTE_PLUS_TTS_2_VOICE_TYPE['지훈'],
  [SCENE.VIETNAMESE]: OPENAI_VOICE_TYPE.ALLOY,
  [SCENE.INDONESIAN]: BYTE_PLUS_TTS_2_VOICE_TYPE.Vivi,
  [SCENE.HINDI]: AMAZON_VOICE_TYPE.ADITI,
  [SCENE.THAI]: OPENAI_VOICE_TYPE.ALLOY,
  [SCENE.ARABIC]: OPENAI_VOICE_TYPE.ALLOY,
  [SCENE.SPANISH]: BYTE_PLUS_TTS_2_VOICE_TYPE.Vivi,
  [SCENE.PORTUGUESE]: BYTE_PLUS_TTS_2_VOICE_TYPE.Mindy,
  [SCENE.FRENCH]: BYTE_PLUS_TTS_2_VOICE_TYPE.Usseau,
  [SCENE.GERMAN]: BYTE_PLUS_TTS_2_VOICE_TYPE.Sven,
  [SCENE.ITALIAN]: BYTE_PLUS_TTS_2_VOICE_TYPE.Enzo,
  [SCENE.RUSSIAN]: AMAZON_VOICE_TYPE.TATYANA,
  [SCENE.TEACHING_ASSISTANT]: BYTE_PLUS_TTS_2_VOICE_TYPE.Pearl,
  [SCENE.TUTOR]: BYTE_PLUS_TTS_2_VOICE_TYPE.Sophie,
  [SCENE.SCREEN_READER]: BYTE_PLUS_TTS_2_VOICE_TYPE.Quentin,
  [SCENE.VIRTUAL_GIRL_FRIEND]: BYTE_PLUS_TTS_2_VOICE_TYPE.Nadia,
  [SCENE.CUSTOMER_SERVICE]: BYTE_PLUS_TTS_2_VOICE_TYPE.Mabel,
};
export function getSceneSettings(scene: SCENE): Partial<ConfigFactory> {
  const language = GOOGLE_ASR_LANGUAGE[scene];
  const voice = voices[scene as keyof typeof voices] || OPENAI_VOICE_TYPE.ALLOY;
  const ttsProvider = Object.values(OPENAI_VOICE_TYPE).includes(voice as OPENAI_VOICE_TYPE)
    ? Provider.OpenAI
    : Object.values(AMAZON_VOICE_TYPE).includes(voice as AMAZON_VOICE_TYPE)
    ? Provider.Amazon
    : Provider.Byteplus;
  return {
    VisionEnable: scene === SCENE.SCREEN_READER,
    'Provider.ASR': language ? Provider.GoogleAsrV2 : Provider.Byteplus,
    'Provider.TTS': ttsProvider,
    'Provider.Avatar': scene === SCENE.TUTOR ? Provider.Akool : Provider.None,
    avatar: scene === SCENE.TUTOR ? AKOOL_AVATAR_TYPE.Tristan : '',
    voice,
    SeedAsrVersion: '2.0',
    SeedTtsVersion: getSeedTtsVersionFromVoice(voice),
    AsrLanguage: language || 'en-US',
    SystemMessages: [Prompt[scene]],
    WelcomeMessage: Welcome[scene],
  };
}
