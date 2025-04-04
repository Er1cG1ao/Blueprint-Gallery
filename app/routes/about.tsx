import React from 'react';
import Layout from "../components/Layout";
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import type { ActionFunction } from "react-router-dom";

// Hero component
const Hero = () => {
  return (
    <div className="bg-[#bbcdd6] min-h-[50vh]">
      <div className="bg-[url(/assets/hero2.png)] bg-no-repeat bg-cover bg-center min-h-[50vh]">
        <div className="min-h-[50vh] flex items-center justify-left">
          <div className="text-left px-36 w-full">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl text-white mb-6 py-7"
            >
              ABOUT US
            </motion.h1>
          </div>
        </div>
      </div>
    </div>
  );
};

// Project Description section
const ProjectDescription = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8 }}
      className="py-16 px-8 bg-[#C5D5DE] text-center"
    >
      <h2 className="text-3xl font-serif mb-8">Project Description</h2>
      <div className="max-w-4xl mx-auto space-y-2 text-gray-700">
        <p>Project Description</p>
        <p>Project Description</p>
        <p>Project Description</p>
        <p>Project Description</p>
        <p>Project Description</p>
      </div>
    </motion.div>
  );
};

// Founders section
const Founders = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const founderVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className="py-16 px-8 bg-[#C5D5DE] text-center"
    >
      <h2 className="text-3xl font-serif mb-12">Founders</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
        <motion.div 
          variants={founderVariants}
          className="flex flex-col items-center"
        >
          <div className="w-32 h-32 bg-gray-300 rounded-full mb-4 overflow-hidden">
            <img 
              src="/assets/profile-placeholder.jpg" 
              alt="Yvonne Li"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/150';
              }}
            />
          </div>
          <h3 className="text-xl font-medium mb-2">Description of Yvonne Li</h3>
          <div className="text-gray-700 space-y-2">
            <p>Description of Yvonne Li</p>
            <p>Description of Yvonne Li</p>
            <p>Description of Yvonne Li</p>
          </div>
        </motion.div>
        
        <motion.div 
          variants={founderVariants}
          className="flex flex-col items-center"
        >
          <div className="w-32 h-32 bg-gray-300 rounded-full mb-4 overflow-hidden">
            <img 
              src="/assets/profile-placeholder.jpg" 
              alt="Tina Qiu"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/150';
              }}
            />
          </div>
          <h3 className="text-xl font-medium mb-2">Description of Tina Qiu</h3>
          <div className="text-gray-700 space-y-2">
            <p>Description of Tina Qiu</p>
            <p>Description of Tina Qiu</p>
            <p>Description of Tina Qiu</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Contributors section
const Contributors = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8 }}
      className="py-16 px-8 bg-[#C5D5DE] text-center"
    >
      <h2 className="text-3xl font-serif mb-12">Contributors</h2>
      <div className="max-w-4xl mx-auto">
        <div className="w-full h-48 bg-gray-600 mb-8">
          {/* Placeholder for contributor picture */}
          <div className="w-full h-full flex items-center justify-center text-white text-2xl">
            Contributor Picture
          </div>
        </div>
        <div className="text-gray-700 space-y-1">
          <p>Contributor Description</p>
          <p>Contributor Description</p>
          <p>Contributor Description</p>
          <p>Contributor Description</p>
        </div>
      </div>
    </motion.div>
  );
};

export function meta() {
  return [
    { title: "About Us | Blueprint Gallery" },
    { name: "description", content: "Learn more about the Blueprint Gallery project and team" },
  ];
}

export default function AboutPage() {
  return (
    <div className="bg-[#C5D5DE]">
      <Layout>
        <Hero />
        <ProjectDescription />
        <Founders />
        <Contributors />
      </Layout>
    </div>
  );
} 