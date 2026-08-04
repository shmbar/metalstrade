
import { Button } from "@components/ui/button";

// ❗ Removed TypeScript types — JSX cannot use interface or typed props
export function SectionHeader({ 
  icon: Icon, 
  title, 
  description, 
  buttonText = "Learn More",
  className 
}) {
  return (
    <div className={`flex flex-col items-start space-y-6 ${className}`}>
      
      {/* Icon Box */}
      <div className="w-16 h-16 bg-[var(--endeavour)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--endeavour)]/20">
        <Icon className="w-8 h-8 text-white" strokeWidth={2} />
      </div>

      {/* Title + Description */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-[var(--endeavour)] tracking-tight">
          {title}
        </h2>
        <p className="text-gray-500 leading-relaxed text-lg max-w-md">
          {description}
        </p>
      </div>

      {/* Button */}
      <Button className="bg-[var(--endeavour)] hover:bg-[var(--brand-deep)] text-white px-8 py-6 rounded-xl text-lg font-medium shadow-lg shadow-[var(--endeavour)]/25 transition-transform hover:scale-105 cursor-pointer">
        {buttonText}
      </Button>

    </div>
  );
}
