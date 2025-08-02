"use client";

import { useState, useEffect } from "react";
import { getRoutesFromPage } from "./actions/getRoutesFromPage";
import { z } from "zod";
import { Moon, Sun, Globe, FileText, ArrowRight, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
  note: z.string().optional(),
});

export default function Home() {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ url?: string; note?: string }>({});
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Use server action for form submission
  const [routes, setRoutes] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  async function onSubmitAction(formData: FormData) {
    setErrors({});
    setActionError(null);
    setRoutes([]);

    const url = formData.get("url");
    const note = formData.get("note");

    const result = formSchema.safeParse({
      url: url ? String(url) : "",
      note: note ? String(note) : undefined,
    });

    if (!result.success) {
      const fieldErrors: { url?: string; note?: string } = {};
      result.error.issues.forEach((err) => {
        if (err.path[0] === "url") fieldErrors.url = err.message;
        if (err.path[0] === "note") fieldErrors.note = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Call server action
    const resp = await getRoutesFromPage(String(url));
    if (resp.error) {
      setActionError(resp.error);
    } else {
      console.log(resp);
      // setRoutes(resp.routes || []);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-500 ease-in-out flex flex-col justify-center items-center">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-[1.2rem] w-[1.2rem] transition-transform duration-300" />
          ) : (
            <Moon className="h-[1.2rem] w-[1.2rem] transition-transform duration-300" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 text-center">
        <form action={onSubmitAction}>
          {/* Show error or routes */}
          {actionError && (
            <div className="text-red-500 text-center mt-4">{actionError}</div>
          )}
          {routes.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-2">Routes found:</h2>
              <ul className="text-left inline-block">
                {routes.map((route) => (
                  <li
                    key={route}
                    className="text-base text-gray-800 dark:text-gray-200"
                  >
                    {route}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <h1 className="w-full max-w-7xl mx-auto text-3xl md:text-7xl font-bold text-black dark:text-white mb-6 leading-tight transition-colors">
            Replicate and
            <span className="bg-gradient-to-r from-black to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              {" "}
              Enhance
            </span>
          </h1>

          {/* Updated Subheading */}
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto font-medium transition-colors">
            Turn any website into code with just a URL ✨
          </p>

          {/* Input Section */}
          <div className="max-w-4xl mx-auto space-y-6">
            {/* URL Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                <Globe className="h-5 w-5 text-gray-500 dark:text-gray-400 transition-colors" />
              </div>
              <Input
                type="url"
                name="url"
                placeholder="Example: 'https://stripe.com'"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={`h-16 pl-12 pr-4 text-lg bg-gray-50 dark:bg-gray-950 border-2 rounded-lg focus:border-black dark:focus:border-white focus:ring-0 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-black dark:text-white shadow-sm transition-all duration-300 ${
                  errors.url
                    ? "border-red-500 dark:border-red-400"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                required
              />
              {errors.url && (
                <div className="text-left text-red-500 text-sm mt-1 ml-1">
                  {errors.url}
                </div>
              )}
            </div>

            {/* Note Textarea */}
            <div className="relative">
              <div className="absolute left-4 top-4 z-10">
                <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400 transition-colors" />
              </div>
              <Textarea
                name="note"
                placeholder="Example: 'Make it responsive with dark mode support and add smooth animations'"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                className={`pl-12 pr-4 pt-4 pb-4 text-lg bg-gray-50 dark:bg-gray-950 border-2 rounded-lg focus:border-black dark:focus:border-white focus:ring-0 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-black dark:text-white resize-none shadow-sm min-h-[120px] transition-all duration-300 ${
                  errors.note
                    ? "border-red-500 dark:border-red-400"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.note && (
                <div className="text-left text-red-500 text-sm mt-1 ml-1">
                  {errors.note}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                size="lg"
                type="submit"
                className="bg-gradient-to-r from-black to-gray-800 hover:from-gray-900 hover:to-black text-white dark:from-white dark:to-gray-200 dark:hover:from-gray-100 dark:hover:to-white dark:text-black px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Replication
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                type="button"
                className="border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-400 px-8 py-6 text-lg rounded-lg bg-transparent transition-all duration-200"
              >
                <Globe className="w-5 h-5 mr-2" />
                View Examples
              </Button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-16">
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
            Enter a URL and let AI replicate and enhance your website with
            modern best practices
          </p>
        </div>
      </div>
    </div>
  );
}
