import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PieChart } from 'lucide-react';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
      {/* Absolute Header */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <PieChart className="w-5 h-5 text-primary-foreground" />
          </div>
          ExpenseAI
        </div>
        <ThemeToggle />
      </div>

      {/* Decorative background vectors/gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[0%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px]" />
      </div>

      {/* Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>

      {/* Marketing/Banner Section (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-muted relative items-center justify-center overflow-hidden z-10 border-l border-border/50">
        
        {/* Glass plate illustration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] mix-blend-screen" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="relative max-w-lg z-20 flex flex-col items-start gap-8"
        >
          <div className="bg-background/80 backdrop-blur-xl border p-8 rounded-3xl shadow-2xl flex flex-col gap-6">
            <div className="p-4 rounded-xl bg-primary/10 w-fit">
              <PieChart className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
              Manage your finances <br/><span className="text-primary">intelligently.</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Track expenses, monitor active EMIs, and understand your spending patterns with beautiful, insightful analytics without the hassle of spreadsheets.
            </p>

            <div className="flex -space-x-4 mt-6">
              {[1,2,3,4].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-background overflow-hidden relative">
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}`} alt="user" className="w-full h-full object-cover bg-secondary" />
                </div>
              ))}
              <div className="w-12 h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground z-10">
                +4k
              </div>
            </div>
            <p className="text-sm font-medium mt-2">Join thousands of smart spenders.</p>
          </div>
        </motion.div>

        {/* Floating gradient orb */}
        <motion.div 
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          className="absolute right-10 top-1/4 w-32 h-32 bg-primary/30 rounded-full blur-3xl z-0" 
        />
      </div>
    </div>
  );
}
