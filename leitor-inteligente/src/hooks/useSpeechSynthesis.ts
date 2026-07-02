import { useState, useEffect, useRef } from 'react';

export const useSpeechSynthesis = (
  text: string,
  setText: React.Dispatch<React.SetStateAction<string>>
) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [status, setStatus] = useState<string>('Pronto');
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Carrega as vozes do sistema operacional
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Tenta selecionar uma voz em PT-BR por padrão, se houver
      const ptBrIndex = availableVoices.findIndex(v => v.lang.includes('PT-BR') || v.lang.includes('pt-BR'));
      if (ptBrIndex !== -1) setSelectedVoiceIndex(ptBrIndex);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const playFromPosition = (startPos: number) => {
    window.speechSynthesis.cancel();
    const textToSpeak = text.substring(startPos);

    if (!textToSpeak.trim()) {
      setStatus('❌ Fim do texto!');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }

    utterance.onstart = () => setStatus('🔊 Reproduzindo...');
    utterance.onend = () => setStatus('⏹️ Pronto');
    utterance.onerror = () => setStatus('⚠️ Erro na reprodução');

    window.speechSynthesis.speak(utterance);
    setCursorPosition(startPos);
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

      // Atualiza o cursor visualmente no React
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