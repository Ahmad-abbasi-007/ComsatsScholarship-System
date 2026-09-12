"use client";

import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaArrowUp } from "react-icons/fa";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-gradient-to-b from-blue-950 via-indigo-950 to-blue-950 text-white py-16 px-8 border-t border-cyan-400/20">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 text-left">
        
        {/* ------------------------------------This  is for Brand / About --------------------------------------------*/}
        <div>
          <h2 className="text-2xl font-bold text-cyan-300 mb-4">COMSATS Scholarship Portal</h2>
          <p className="text-blue-200 leading-relaxed text-sm mb-4">
            A small river named Duden flows by their place and supplies it with the necessary regelialia. 
            Dedicated to empowering students and promoting academic excellence.
          </p>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 bg-cyan-400 text-blue-950 font-semibold px-5 py-2 rounded-full hover:opacity-90 transition"
          >
            <FaArrowUp /> Back to Top
          </button>
        </div>

        {/* -----------------------------------This  is for Discover Section ------------------------------------*/}
        <div>
          <h3 className="text-xl font-semibold text-cyan-300 mb-4">Discover</h3>
          <ul className="space-y-2 text-blue-200 text-sm">
            <li><a href="#" className="hover:text-cyan-300">Buy & Sell</a></li>
            <li><a href="#" className="hover:text-cyan-300">Merchant</a></li>
            <li><a href="#" className="hover:text-cyan-300">Giving Back</a></li>
            <li><a href="#" className="hover:text-cyan-300">Help & Support</a></li>
          </ul>
        </div>

        {/* ---------------------------------This  is  for  Resources Section ----------------------------------*/}
        <div>
          <h3 className="text-xl font-semibold text-cyan-300 mb-4">Resources</h3>
          <ul className="space-y-2 text-blue-200 text-sm">
            <li><a href="#" className="hover:text-cyan-300">Security</a></li>
            <li><a href="#" className="hover:text-cyan-300">Privacy</a></li>
            <li><a href="#" className="hover:text-cyan-300">Global Charts</a></li>
            <li><a href="#" className="hover:text-cyan-300">Terms & Compliance</a></li>
          </ul>
        </div>

        {/* -----------------------------------This  is for Social / Partners ---------------------------------------*/}
        <div>
          <h3 className="text-xl font-semibold text-cyan-300 mb-4">Follow Us</h3>
          <div className="flex gap-4 mb-6 text-cyan-300 text-xl">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-white"><FaFacebookF /></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white"><FaTwitter /></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white"><FaInstagram /></a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white"><FaLinkedinIn /></a>
          </div>

          <h4 className="text-cyan-300 font-semibold mb-3">Our Partners:</h4>
          <ul className="grid grid-cols-2 gap-2 text-blue-200 text-sm">
            <li>Company 01</li>
            <li>Company 02</li>
            <li>Company 03</li>
            <li>Company 04</li>
            <li>Company 05</li>
            <li>Company 06</li>
          </ul>
          <a href="#" className="text-cyan-400 mt-2 block hover:underline text-sm">See All →</a>
        </div>
      </div>

      {/* ----------------------------This is for Divider --------------------------------*/}
      <div className="border-t border-cyan-400/20 mt-12 pt-6 text-center text-sm text-blue-300">
        <p>
          Copyright © {new Date().getFullYear()} All rights reserved | 
          Made with 💙 by <a href="https://github.com/Ahmad-abbasi-007" target="_blank" className="text-cyan-300 hover:underline">Ahmad Raza</a>
        </p>
        <div className="mt-2 space-x-4">
          <a href="#" className="hover:text-cyan-300">Terms</a>
          <a href="#" className="hover:text-cyan-300">Privacy</a>
          <a href="#" className="hover:text-cyan-300">Compliances</a>
        </div>
      </div>
    </footer>
  );
}
