import Torii from "@/components/Torii";

export default function ImagePlaceholder({ label = "Photograph forthcoming" }: { label?: string }) {
  return (
    <div className="relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-md border hairline bg-washi-deep">
      <Torii className="absolute -right-8 -top-10 h-[150%] w-auto text-vermilion/[0.06]" />
      <Torii className="absolute -left-10 bottom-[-20%] h-[120%] w-auto text-sumi/[0.04]" />
      <span className="kicker relative">{label}</span>
    </div>
  );
}
