import { Button } from "../ui/button";
import { Github } from "lucide-react";

export const Loading = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-8 bg-background text-center px-4">
      <div className="flex flex-col items-center gap-4 max-w-md">
        <h1 className="text-3xl font-bold">⏳ Hold tight, deploying some coolness...</h1>
        <p className="text-muted-foreground">
          This app runs on a free plan — it might nap a bit before waking up. Meanwhile, you can flex your support by starring my stuff:
        </p>
        <Button variant="outline" size="lg" asChild className="flex items-center gap-2" aria-label="GitHub">
          <a href="https://github.com/teovlt" target="_blank" rel="noopener noreferrer">
            <Github className="h-5 w-5" />
            Star me on GitHub
          </a>
        </Button>
      </div>

      <div className="flex items-end justify-center gap-3 h-6">
        <span className="block w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0s]"></span>
        <span className="block w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.15s]"></span>
        <span className="block w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.3s]"></span>
      </div>

      <p className="text-xs text-muted-foreground animate-pulse">Fun fact: you just made my server wake up from a nap 💤</p>
    </div>
  );
};
