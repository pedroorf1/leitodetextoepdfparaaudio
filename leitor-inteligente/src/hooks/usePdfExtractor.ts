import { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';

// Configura o worker apontando para o CDN oficial compatível com a versão instalada
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const usePdfExtractor = () => {
  const [text, setText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('Nenhum arquivo selecionado');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const extractTextFromPdf = async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          // Filtra apenas itens que possuem a propriedade 'str' (texto)
          .map((item: any) => item.str)
          .join(' ');

        fullText += pageText + '\n';
      }

      setText(fullText);
    } catch (error) {
      console.error('Erro ao extrair PDF:', error);
      alert('Falha ao ler o arquivo PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return { text, setText, fileName, isProcessing, extractTextFromPdf };
};