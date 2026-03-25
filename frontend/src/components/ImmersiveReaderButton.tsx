"use client"

import React, { useState } from 'react';
import { getImmersiveReaderToken } from '@/lib/immersive-reader';
import { BookOpen, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImmersiveReaderButtonProps {
  title: string;
  content: string;
  className?: string;
}

export function ImmersiveReaderButton({ title, content, className }: ImmersiveReaderButtonProps) {
  const [loading, setLoading] = useState(false);

  const cleanMarkdown = (text: string) => {
    return text
      .replace(/```[a-z]*\n[\s\S]*?\n```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/#+\s+(.*)/g, '$1\n') // Headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italics
      .replace(/^\s*[-*+]\s+(.*)/gm, '$1') // Bullets
      .replace(/^\s*\d+\.\s+(.*)/gm, '$1') // Numbered lists
      .replace(/>\s+(.*)/gm, '$1') // Quotes
      .replace(/`{1,2}(.*?)`{1,2}/g, '$1') // Inline code
      .replace(/\n\s*\n/g, '\n\n') // Normal spacing
      .trim();
  };

  const handleLaunch = async () => {
    setLoading(true);
    console.log("Iniciando Lector Inmersivo...");
    try {
      const { token, subdomain } = await getImmersiveReaderToken();
      
      const cleanedContent = cleanMarkdown(content);

      if (!(window as unknown as { ImmersiveReader?: unknown }).ImmersiveReader) {
        console.log("Cargando SDK del Lector Inmersivo...");
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://ircdname.azureedge.net/immersivereadersdk/immersive-reader-sdk.1.4.0.js';
          script.onload = resolve;
          script.onerror = (err) => {
            console.error("SDK Load Error:", err);
            reject(new Error("No se pudo cargar el archivo del Lector Inmersivo (Red/CDN error)."));
          };
          document.head.appendChild(script);
        });
      }

      const data = {
        title: title,
        chunks: [{
          content: cleanedContent,
          mimeType: "text/plain" // Plain text now
        }]
      };

      const options = {
        onExit: () => console.log("Lector Inmersivo cerrado"),
        uiZIndex: 3000
      };

      console.log("Lanzando Lector Inmersivo con subdominio:", subdomain);
      const immersiveReader = (window as unknown as { ImmersiveReader: { launchAsync: (token: string, subdomain: string, data: unknown, options: unknown) => Promise<void> } }).ImmersiveReader;
      await immersiveReader.launchAsync(token, subdomain, data, options);
    } catch (error) {
      console.error("Error al lanzar el Lector Inmersivo:", error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      alert(`Hubo un problema: ${errorMessage}\n\nRevisa la consola (F12) para más detalles.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleLaunch();
      }}
      disabled={loading}
      className={cn(
        "group flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-secondary/10 to-primary/10 hover:from-secondary/20 hover:to-primary/20 text-foreground rounded-2xl border border-secondary/30 transition-all duration-300 interactive-element disabled:opacity-50 calm-shadow",
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      ) : (
        <div className="relative">
          <BookOpen className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />
          <Sparkles className="w-3 h-3 text-primary absolute -top-1 -right-1 animate-pulse" />
        </div>
      )}
      <div className="flex flex-col items-start leading-none">
        <span className="text-sm font-bold">Lector Inmersivo</span>
        <span className="text-[10px] opacity-60">Ayuda para leer</span>
      </div>
    </button>
  );
}
