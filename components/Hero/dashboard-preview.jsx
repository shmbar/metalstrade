import Image from "next/image";

export default function DashboardPreview() {
  return (
    <div className="relative rounded-3xl p-3 bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl">
      <div className="rounded-2xl overflow-hidden shadow-inner">
        <Image
          src="/dashboard-preview.png"
          alt="IMS Dashboard Preview"
          width={900}
          height={600}
          className="w-full h-auto object-cover"
          priority
        />
      </div>
    </div>
  );
}
