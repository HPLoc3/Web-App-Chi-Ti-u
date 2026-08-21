import React from 'react';
import { 
  Code2, 
  Layers, 
  Database, 
  Sparkles, 
  ShieldCheck, 
  Cpu
} from 'lucide-react';

export default function TechStackSection() {
  const stackGroups = [
    {
      category: "Frontend & Giao diện",
      icon: <Layers size={16} className="text-emerald-700" />,
      items: ["React 18", "TypeScript", "Tailwind CSS", "Lucide Icons", "Recharts D3"]
    },
    {
      category: "Backend & Dịch vụ",
      icon: <Code2 size={16} className="text-blue-700" />,
      items: ["Node.js", "Express REST API", "Zod Validation", "CORS Guard"]
    },
    {
      category: "Cơ sở Dữ liệu & Lưu trữ",
      icon: <Database size={16} className="text-amber-700" />,
      items: ["PostgreSQL", "Prisma ORM", "Firebase Firestore", "IndexedDB / LocalStorage"]
    },
    {
      category: "AI & Bảo mật Hệ thống",
      icon: <ShieldCheck size={16} className="text-purple-700" />,
      items: ["Gemini / NLP Tiếng Việt", "Bcrypt Hashing", "JWT Double Token", "Express Rate Limit"]
    }
  ];

  return (
    <section className="py-14 sm:py-16 bg-[#FAF9F6] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="text-xs font-mono uppercase font-bold text-stone-500 tracking-wider">
            Nền tảng Công nghệ
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-emerald-950">
            Kiến trúc Hiện đại, Vững chắc & Tối ưu Tốc độ
          </h2>
          <p className="text-xs sm:text-sm text-stone-600">
            Hệ thống được phát triển theo tiêu chuẩn công nghệ SaaS cao cấp, đảm bảo hiệu năng và độ ổn định lâu dài.
          </p>
        </div>

        {/* Tech Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stackGroups.map((group, idx) => (
            <div 
              key={idx}
              className="bg-white border border-stone-200/90 rounded-xl p-4 space-y-3 shadow-2xs hover:border-stone-400 transition-colors"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                {group.icon}
                <h3 className="font-serif font-bold text-xs sm:text-sm text-stone-900">
                  {group.category}
                </h3>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {group.items.map((tech, i) => (
                  <span 
                    key={i}
                    className="text-[11px] font-mono font-medium px-2 py-1 rounded bg-stone-100 text-stone-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
