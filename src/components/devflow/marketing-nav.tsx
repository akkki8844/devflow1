import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Github, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/devflow/logo";
import { useState } from "react";

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/#features", label: "Features" },
    { to: "/#demo", label: "Demo" },
    { to: "/#pricing", label: "Pricing" },
  ];
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="glass rounded-2xl flex items-center justify-between px-4 py-2.5">
          <Link to="/" className="flex items-center"><Wordmark /></Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <a key={l.to} href={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md">
                {l.label}
              </a>
            ))}
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md inline-flex items-center gap-1.5">
              <Github className="h-4 w-4" /> GitHub
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild variant="glow" size="sm">
              <Link to="/signup">Get started</Link>
            </Button>
            <button onClick={() => setOpen(!open)} className="md:hidden p-2 -mr-2 text-muted-foreground" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
        {open && (
          <div className="md:hidden mt-2 glass rounded-2xl p-3 flex flex-col gap-1">
            {links.map((l) => (
              <a key={l.to} href={l.to} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md" onClick={() => setOpen(false)}>{l.label}</a>
            ))}
          </div>
        )}
      </div>
    </motion.header>
  );
}
