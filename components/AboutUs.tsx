"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { AcademicCapIcon, ShieldCheckIcon, UsersIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import FAQSection from "./FAQSection";

export default function AboutUs() {
  const team = [
    { name: "Dr. A. Basit", role: "Founder & Director", image: "/images/Basit-photo.jpeg" },
    { name: "Ms. Sarah Khan", role: "Scholarship Coordinator", image: "/images/sara-profile.jpg" },
    { name: "Mr. Ahmad Raza", role: "Web & Dev Lead", image: "/images/my-photo.jpeg" },
  ];

  const values = [
    { title: "Academic Excellence", icon: AcademicCapIcon },
    { title: "Transparency & Integrity", icon: ShieldCheckIcon },
    { title: "Inclusivity & Equal Opportunity", icon: UsersIcon },
    { title: "Empowering Students", icon: LightBulbIcon },
  ];

  return (
    <section
      id="about"
      className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-blue-950 text-white px-6 py-32"
    >
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-cyan-300 mb-4 text-left"
        >
          About COMSATS Scholarship Portal
        </motion.h1>

        <motion.p
          initial={false}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-blue-200 text-base md:text-lg max-w-3xl mb-16 leading-relaxed text-left"
        >
          Our platform is dedicated to empowering students across COMSATS University by providing
          comprehensive scholarship information, easy application processes, and transparent
          guidelines. We believe in fostering academic growth and financial support for deserving
          candidates.
        </motion.p>

        {/* ---------------------------------This is for Mission & Vision --------------------------------*/}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/10 backdrop-blur-md border border-cyan-400/30 rounded-3xl p-8 shadow-xl text-left"
          >
            <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Our Mission</h2>
            <p className="text-blue-200 leading-relaxed text-base mb-4">
              To provide an accessible and centralized platform for all students to explore
              scholarships, apply easily, and ensure deserving candidates receive financial support
              to continue their education without obstacles.
            </p>
            <p className="text-blue-200 text-sm">
              We strive to simplify scholarship access and create equal opportunities for every
              student, enabling them to achieve their academic potential without financial barriers.
            </p>
          </motion.div>

          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/10 backdrop-blur-md border border-cyan-400/30 rounded-3xl p-8 shadow-xl text-left"
          >
            <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Our Vision</h2>
            <p className="text-blue-200 leading-relaxed text-base mb-4">
              To become the most trusted scholarship platform within the academic community,
              promoting academic excellence, equal opportunity, and holistic student development.
            </p>
            <p className="text-blue-200 text-sm">
              Our vision is to empower students not just financially but academically, fostering a
              culture of growth, integrity, and inclusivity across COMSATS University.
            </p>
          </motion.div>
        </div>

        {/* ---------------------------------------This is for Core Values ------------------------------------*/}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-left"
        >
          <h2 className="text-3xl font-semibold text-cyan-300 mb-10">Our Core Values</h2>
          <div className="flex flex-wrap gap-12">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <div key={i} className="flex items-center gap-4 max-w-sm">
                  <div className="w-16 h-16 bg-cyan-400/20 rounded-full flex items-center justify-center">
                    <Icon className="w-8 h-8 text-cyan-300" />
                  </div>
                  <p className="text-blue-200 font-medium text-lg">{value.title}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* -----------------------------------------This is for Team Section -------------------------------------*/}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-left"
        >
          <h2 className="text-3xl font-semibold text-cyan-300 mb-12">Meet the Team</h2>
          <div className="flex flex-wrap gap-12">
            {team.map((member, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-cyan-400/30 shadow-lg">
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={128}
                    height={128}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-cyan-300">{member.name}</h3>
                  <p className="text-blue-200">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <FAQSection />
      </div>
    </section>
  );
}
