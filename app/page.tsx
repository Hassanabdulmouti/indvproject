import React from "react";
import { FlipWords } from "@/components/ui/flip-words";

export default function Home() {
  const words = ["efficiently", "smartly", "easily", "systematically", "stress-free"];
  
  return (
    <div className="h-[40rem] flex justify-center items-center px-4">
      <div className="text-4xl mx-auto font-normal text-neutral-600 dark:text-neutral-400 text-center">
        Organize your move
        <FlipWords words={words} /> <br />
        with digital box labeling
      </div>
    </div>
  );
}