import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Checkbox } from "./components/ui/checkbox";
import imgBackgroundImage from "figma:asset/04282b950888342f7ee2c11862c653b3aa64ee98.png";
import imgCTULogo from "figma:asset/a236ffe9952e477b22f287bb10c2b30876c0db09.png";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", { email, password, rememberMe });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Background Image with Gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden rounded-br-[20px] rounded-tr-[20px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={imgBackgroundImage}
            alt="CTU Campus"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(222, 6, 2, 0.3) 0%, rgba(120, 3, 1, 0.5) 100%)",
          }}
        />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 bg-white bg-opacity-90 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-32 h-32 relative">
              <img
                src={imgCTULogo}
                alt="Cebu Technological University Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Headings */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-medium text-[#181818]">
              Cebu Technological University
            </h1>
            <h2 className="text-2xl font-medium text-black">Sign in</h2>
            <p className="text-lg text-black">
              to continue Opticore-Campus Intelligence System
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-lg text-[#181818]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-xl border-[rgba(0,0,0,0.25)] shadow-md text-base placeholder:text-[#636364]"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-lg text-[#181818]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="**********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 rounded-xl border-[rgba(0,0,0,0.25)] shadow-md text-base placeholder:text-[#636364]"
                required
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked === true)
                  }
                  className="border-[rgba(0,0,0,0.25)]"
                />
                <Label
                  htmlFor="remember"
                  className="text-base text-[#181818] cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                className="text-base text-[#181818] hover:underline"
              >
                Forgot password
              </button>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold"
            >
              Sign in
            </Button>

            {/* Sign Up Link */}
            <p className="text-center text-base">
              <span className="text-[#595959]">Don't have an account? </span>
              <button
                type="button"
                className="text-[#5483b3] hover:underline"
              >
                Sign up for free!
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}