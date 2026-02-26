import { useState, useEffect } from "react";

// Transparency Page (localStorage viewer)
const TransparencyPage = () => {
  const [localData, setLocalData] = useState({});

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("jarvisData") || "{}");
    setLocalData(data);
  }, []);

  return (
    <div className="glassmorphic p-4 m-4">
      <h2 className="text-xl font-bold mb-3">What JARVIS Knows</h2>
      <pre className="text-sm bg-gray-800 p-4 rounded-md">
        {JSON.stringify(localData, null, 2)}
      </pre>
    </div>
  );
};

export default TransparencyPage;