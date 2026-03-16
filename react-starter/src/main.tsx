import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Theme as RadixTheme } from "@radix-ui/themes";
import App from "./App.tsx";
import Playground from "./pages/Playground.tsx";
import DocsIndex from "./pages/docs/DocsIndex.tsx";
import DocEmbed from "./pages/docs/DocEmbed.tsx";
import LabourLayout from "./pages/labour/LabourLayout.tsx";
import LabourDashboard from "./pages/labour/LabourDashboard.tsx";
import PartographView from "./pages/labour/PartographView.tsx";
import NewCase from "./pages/labour/NewCase.tsx";
import "./index.css";
import "@radix-ui/themes/styles.css";

// MUI theme with Google Sans
const muiTheme = createTheme({
  typography: {
    fontFamily: '"Google Sans", "Google Sans Text", "Google Sans Display", "Noto Sans Thai", system-ui, sans-serif',
  },
  palette: {
    primary: { main: "#4285F4" },
    secondary: { main: "#34A853" },
    error: { main: "#EA4335" },
    warning: { main: "#FBBC05" },
  },
});

// All HeroUI component doc URLs
const heroUIDocs: Record<string, { title: string; url: string }> = {
  input:        { title: "Input",       url: "https://www.heroui.com/docs/components/input" },
  button:       { title: "Button",      url: "https://www.heroui.com/docs/components/button" },
  select:       { title: "Select",      url: "https://www.heroui.com/docs/components/select" },
  checkbox:     { title: "Checkbox",    url: "https://www.heroui.com/docs/components/checkbox" },
  switch:       { title: "Switch",      url: "https://www.heroui.com/docs/components/switch" },
  slider:       { title: "Slider",      url: "https://www.heroui.com/docs/components/slider" },
  textarea:     { title: "Textarea",    url: "https://www.heroui.com/docs/components/textarea" },
  card:         { title: "Card",        url: "https://www.heroui.com/docs/components/card" },
  modal:        { title: "Modal",       url: "https://www.heroui.com/docs/components/modal" },
  table:        { title: "Table",       url: "https://www.heroui.com/docs/components/table" },
  tabs:         { title: "Tabs",        url: "https://www.heroui.com/docs/components/tabs" },
  navbar:       { title: "Navbar",      url: "https://www.heroui.com/docs/components/navbar" },
  dropdown:     { title: "Dropdown",    url: "https://www.heroui.com/docs/components/dropdown" },
  avatar:       { title: "Avatar",      url: "https://www.heroui.com/docs/components/avatar" },
  chip:         { title: "Chip",        url: "https://www.heroui.com/docs/components/chip" },
  spinner:      { title: "Spinner",     url: "https://www.heroui.com/docs/components/spinner" },
  "date-picker": { title: "Date Picker", url: "https://www.heroui.com/docs/components/date-picker" },
  tooltip:      { title: "Tooltip",     url: "https://www.heroui.com/docs/components/tooltip" },
};

function DocPage({ component }: { component: string }) {
  const doc = heroUIDocs[component];
  if (!doc) return <div className="p-8">ไม่พบคอมโพเนนต์</div>;
  return <DocEmbed title={`${doc.title} — HeroUI`} url={doc.url} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/digital-partograph">
      <HeroUIProvider>
        <ThemeProvider theme={muiTheme}>
          <RadixTheme accentColor="blue" radius="medium">
            <Routes>
              <Route path="/" element={<Navigate to="/labour" replace />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/docs" element={<DocsIndex />} />
              {Object.keys(heroUIDocs).map((key) => (
                <Route
                  key={key}
                  path={`/docs/${key}`}
                  element={<DocPage component={key} />}
                />
              ))}
              {/* Labour Room System */}
              <Route path="/labour" element={<LabourLayout />}>
                <Route index element={<LabourDashboard />} />
                <Route path="cases" element={<LabourDashboard />} />
                <Route path="cases/new" element={<NewCase />} />
                <Route path="partograph/:id" element={<PartographView />} />
              </Route>
            </Routes>
          </RadixTheme>
        </ThemeProvider>
      </HeroUIProvider>
    </BrowserRouter>
  </StrictMode>
);
