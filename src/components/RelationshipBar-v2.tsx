import { motion } from "framer-motion";

// Relationship level system (5 levels)
const levels = [
  { name: "Stranger", emoji: "👋", color: "#666" },
  { name: "Acquaintance", emoji: "🤝", color: "#4CAF50" },
  { name: "Friend", emoji: "😊", color: "#2196F3" },
  { name: "Best Friend", emoji: "🔥", color: "#FF9800" },
  { name: "JARVIS Mode", emoji: "🤖", color: "#ff1a88" },
];

// Animated progress bar
const progressVariants = {
  initial: { width: 0 },
  animate: { width: "100%", transition: { duration: 1 } },
};

// Relationship Bar Component
const RelationshipBar = ({ level = 1 }) => {
  const currentLevel = levels[level - 1];
  return (
    <motion.div
      className="glassmorphic p-3 mb-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h3 className="text-lg font-bold">Relationship Level: {currentLevel.name} {currentLevel.emoji}</h3>
      <div className="h-2 bg-gray-200 rounded-full mt-2">
        <motion.div
          className={`h-full rounded-full`}
          style={{ backgroundColor: currentLevel.color, width: `${(level / 5) * 100}%` }}
          variants={progressVariants}
          initial="initial"
          animate="animate"
        />
      </div>
    </motion.div>
  );
};

export default RelationshipBar;