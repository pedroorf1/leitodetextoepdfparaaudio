import { useState, useRef } from 'react';

const API = import.meta.env.VITE_API_SOURCE || '';

export const useSpeechSynthesis = (
  text: string,
  setText: React.Dispatch<React.SetStateAction<string>>
) => {
  const [status, setStatus] = useState<string>('Pronto');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [aylaSpeech, setAylaSpeech] = useState<string>(''); // Texto que a IA gerou

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Controle de Fila por Frases/Trechos Curtos para o Agente
  const paragraphsQueueRef = useRef<string[]>([]);
  const currentParagraphIndexRef = useRef<number>(0);

  // Cache para o áudio da próxima frase (Garante fluidez e evita latência de rede)
  const nextAudioCacheRef = useRef<HTMLAudioElement | null>(null);
  const isPreFetchingRef = useRef<boolean>(false);

  // ✂️ Quebra o texto em frases curtas baseadas em pontuação (. ! ?)
  const splitIntoPhrases = (fullText: string): string[] => {
    return fullText
      .split(/(?<=[.!?])\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  };

  // 🔄 Faz a requisição antecipada da próxima frase em segundo plano
  const preFetchNextPhrase = async () => {
    const queue = paragraphsQueueRef.current;
    const nextIndex = currentParagraphIndexRef.current + 1;

    if (nextIndex >= queue.length || isPreFetchingRef.current) return;

    try {
      isPreFetchingRef.current = true;
      const nextRawPhrase = queue[nextIndex];

      const baseUrl = API.endsWith('/api/v1') ? API : `${API}/api/v1`;

      const response = await fetch(`${baseUrl}/tts/read-paragraph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraph: nextRawPhrase })
      });

      const data = await response.json();
      const audioSource = data.audioData || data.audioUrl; // Prioriza o Base64 natural do backend

      if (response.ok && audioSource) {
        const nextAudio = new Audio(audioSource);
        nextAudio.preload = "auto";

        // Guarda o texto interpretado dentro do próprio objeto de áudio para recuperar na fila
        (nextAudio as any)._textoInterpretado = data.textoInterpretado || data.textoInterpretated;

        nextAudioCacheRef.current = nextAudio;
      }
    } catch (e) {
      console.error('Erro no pre-fetch de áudio:', e);
    } finally {
      isPreFetchingRef.current = false;
    }
  };

  // 🤖 O CORAÇÃO DO AGENTE: Consome a API do seu MVP de forma contínua
  const playCurrentParagraph = async () => {
    const queue = paragraphsQueueRef.current;
    const index = currentParagraphIndexRef.current;

    if (index >= queue.length) {
      setStatus('⏹️ Fim da leitura do documento pelo Agente.');
      setIsPlaying(false);
      return;
    }

    // Interrompe qualquer áudio remanescente que esteja tocando antes de iniciar o próximo
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // --- FLUXO A: Usar áudio pré-carregado no Cache ---
    if (nextAudioCacheRef.current) {
      const audio = nextAudioCacheRef.current;
      audioRef.current = audio;
      nextAudioCacheRef.current = null;

      // Recupera o texto salvo no objeto do áudio cacheado
      if ((audio as any)._textoInterpretado) {
        setAylaSpeech((audio as any)._textoInterpretado);
      }

      audio.onplay = () => {
        setStatus(`🎙️ Ayla lendo trecho ${index + 1}...`);
        setIsPlaying(true);
        preFetchNextPhrase(); // Engatilha o próximo enquanto este toca
      };

      audio.onended = () => {
        currentParagraphIndexRef.current += 1;
        playCurrentParagraph();
      };

      try {
        await audio.play();
        return; // Finaliza o fluxo do cache com sucesso
      } catch (err) {
        console.warn("Falha ao rodar áudio do cache, recuando para requisição padrão", err);
      }
    }

    // --- FLUXO B: Requisição HTTP Padrão (Primeira frase ou se o cache falhar) ---
    const rawParagraph = queue[index];

    try {
      setStatus(`🧠 Ayla pensando e interpretando trecho ${index + 1}...`);

      const baseUrl = API.endsWith('/api/v1') ? API : `${API}/api/v1`;

      const response = await fetch(`${baseUrl}/tts/read-paragraph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraph: rawParagraph })
      });

      const data = await response.json();
      const audioSource = data.audioData || data.audioUrl; // Captura o Base64 nativo natural

      if (!response.ok || !audioSource) {
        throw new Error("Falha na resposta da IA ou áudio não gerado");
      }

      setAylaSpeech(data.textoInterpretado || data.textoInterpretated);

      const audio = new Audio(audioSource);
      audioRef.current = audio;

      audio.onplay = () => {
        setStatus(`🎙️ Ayla lendo trecho ${index + 1}...`);
        setIsPlaying(true);
        preFetchNextPhrase(); // Pede o próximo em background
      };

      audio.onended = () => {
        currentParagraphIndexRef.current += 1;
        playCurrentParagraph();
      };

      await audio.play();

    } catch (error) {
      console.error('Erro no Agente de Leitura:', error);
      setStatus('⚠️ Erro de comunicação com o Provedor. Pulando trecho...');
      currentParagraphIndexRef.current += 1;
      setTimeout(playCurrentParagraph, 1500);
    }
  };

  const playFromPosition = (startPos: number) => {
    const remainingText = text.substring(startPos);
    const phrases = splitIntoPhrases(remainingText);

    if (phrases.length === 0) {
      setStatus('❌ Forneça um texto ou PDF válido.');
      return;
    }

    nextAudioCacheRef.current = null;
    paragraphsQueueRef.current = phrases;
    currentParagraphIndexRef.current = 0;

    playCurrentParagraph();
  };

  const pause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setStatus('🔊 Ayla retomou a leitura...');
    } else {
      audioRef.current.pause();
      setStatus('⏸️ Agente em pausa');
    }
  };

  const stop = () => {
    paragraphsQueueRef.current = [];
    currentParagraphIndexRef.current = 0;
    nextAudioCacheRef.current = null;
    setIsPlaying(false);
    setAylaSpeech('');

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
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
    } else {
      setStatus('⚠️ Fim do documento.');
    }
  };

  return {
    status,
    isPlaying,
    aylaSpeech,
    textareaRef,
    playFromPosition,
    pause,
    stop,
    skipParagraph
  };
};