import { useState, useEffect, useRef } from 'react';

export const useSpeechSynthesis = (
  text: string,
  setText: React.Dispatch<React.SetStateAction<string>>
) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [status, setStatus] = useState<string>('Pronto');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Tenta selecionar prioritariamente a voz Francisca da Microsoft se disponível localmente
      const defaultIndex = availableVoices.findIndex(v =>
        v.name.includes('Francisca') || v.lang.includes('pt-BR')
      );
      if (defaultIndex !== -1) setSelectedVoiceIndex(defaultIndex);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // 🧹 REGRA DO CONFIG: Limpa o texto antes de ler em voz alta
  const preprocessText = (rawText: string): string => {
    let cleanText = rawText;

    // 1. ignore_brackets (Remove tudo entre [ ])
    cleanText = cleanText.replace(/\[.*?\]/g, '');

    // 2. ignore_parentheses (Remove tudo entre ( ))
    cleanText = cleanText.replace(/\(.*?\)/g, '');

    // 3. ignore_asterisks (Remove tudo entre * *)
    cleanText = cleanText.replace(/\*.*?\*/g, '');

    // 4. ignore_angle_brackets (Remove tudo entre < >)
    cleanText = cleanText.replace(/<.*?>/g, '');

    // 5. remove_special_char (Filtra emojis e caracteres especiais complexos de chats)
    // Mantém letras, números, acentuação e pontuações tradicionais de leitura.
    cleanText = cleanText.replace(/[^\w\s\dáàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ.,!?;:()""'\-]/g, '');

    return cleanText;
  };

  const playFromPosition = (startPos: number) => {
    window.speechSynthesis.cancel();

    // Captura o pedaço do texto com base no cursor
    const rawTextToSpeak = text.substring(startPos);

    // Aplica o pré-processador inteligente vindo do conf.yaml
    const sanitizedText = preprocessText(rawTextToSpeak);

    if (!sanitizedText.trim()) {
      setStatus('❌ Fim do texto limpo para leitura!');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sanitizedText);

    if (voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }

    // Configuração base de ritmo (+15% acelerado conforme o arquivo do projeto original)
    utterance.rate = 1.15;
    utterance.pitch = 1.0;

    utterance.onstart = () => setStatus('🔊 Reproduzindo...');
    utterance.onend = () => setStatus('⏹️ Pronto');
    utterance.onerror = (e) => {
      console.error(e);
      setStatus('⚠️ Erro ao sintetizar áudio');
    };

    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus('🔊 Reproduzindo...');
    } else {
      window.speechSynthesis.pause();
      setStatus('⏸️ Pausado');
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setStatus('⏹️ Parado');
  };

  const skipParagraph = () => {
    if (!textareaRef.current) return;

    const currentPos = textareaRef.current.selectionStart;
    const remainingText = text.substring(currentPos);
    const nextLineIndex = remainingText.indexOf('\n');

    if (nextLineIndex !== -1) {
      const newPos = currentPos + nextLineIndex + 1;

      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newPos, newPos);

      playFromPosition(newPos);
      setStatus('⏭️ Pulou para o próximo parágrafo');
    } else {
      setStatus('⚠️ Fim do documento.');
    }
  };

  return {
    voices,
    selectedVoiceIndex,
    setSelectedVoiceIndex,
    status,
    textareaRef,
    playFromPosition,
    pause,
    stop,
    skipParagraph
  };
};