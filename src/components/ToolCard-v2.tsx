import { motion } from "framer-motion";

// Tool Card with hover effects
const toolVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { type: "spring", stiffness: 300 } },
};

// Tool Card Component
const ToolCard = ({ name, category, url }) => {
  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="glassmorphic p-4 block mb-3"
      variants={toolVariants}
      initial="rest"
      whileHover="hover"
    >
      <h3 className="font-bold text-lg">{name}</h3>
      <p className="text-sm text-gray-300">{category}</p>
    </motion.a>
  );
};

export default ToolCard;