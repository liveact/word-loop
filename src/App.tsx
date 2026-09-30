import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import BookshelfPage from "./pages/BookshelfPage";
import BrowsePage from "./pages/BrowsePage";
import { useTheme } from "./hooks/useTheme";

function AppLayout() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-bg text-ink">
      <header className="sticky top-0 z-30 h-16 px-5 md:px-8 flex items-center justify-between border-b border-line bg-bg/80 backdrop-blur-sm">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 cursor-pointer group"
          aria-label="回到书架"
        >
          <img src="/icon.svg" alt="" className="w-8 h-8 rounded-[10px]" />
          <span className="text-xl font-bold tracking-tight select-none group-hover:text-accent transition-colors">
            WordLoop
          </span>
        </button>

        <button
          onClick={toggle}
          aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
          className="p-2.5 rounded-xl text-ink-soft hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10 flex flex-col">
        <Routes>
          <Route path="/" element={<BookshelfPage />} />
          <Route path="/browse/:book" element={<BrowsePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
