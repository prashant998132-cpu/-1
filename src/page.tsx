import ChatInterface from "./components/ChatInterface-v4";
import RelationshipBar from "./components/RelationshipBar-v2";
import ToolCard from "./components/ToolCard-v2";
import TransparencyPage from "./components/TransparencyPage";

// Main Page
const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <h1 className="text-3xl font-bold text-center mb-6" style={{ color: "#ff1a88" }}>
        JARVIS v4.0 🤖
      </h1>
      <RelationshipBar level={3} />
      <ChatInterface />
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-3">Tools</h2>
        <ToolCard name="Canva" category="Design" url="https://canva.com" />
        <ToolCard name="Gemini" category="AI" url="https://gemini.google.com" />
      </div>
      <TransparencyPage />
    </div>
  );
};

export default HomePage;