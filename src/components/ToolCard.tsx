import Link from "next/link";
import { ToolItem } from "@/lib/tools-data";
import { 
  Minimize2, 
  FileImage, 
  Repeat, 
  Maximize, 
  Crop, 
  FileText, 
  Type, 
  Subtitles, 
  ArrowRight,
  Combine,
  Split,
  Layers,
  Code,
  FileSpreadsheet,
  Link as LinkIcon,
  Binary,
  Search, 
  FileCode,
  Volume2,
  Scissors,
  Music,
  Film,
  Camera,
  Archive,
  Table2,
  Percent,
  Calendar,
  Clock,
  QrCode,
  KeyRound,
  Palette,
  Sparkles,
  AlignLeft,
  PaintBucket,
  Grid,
  Globe,
  FileCode2,
  Pipette,
  Stamp,
  Contrast,
  BoxSelect,
  Square,
  Move3d,
  Columns3,
  LayoutGrid,
  Tag,
  Share2,
  Bot,
  Network,
  Link2,
  Ruler,
  Briefcase,
  Landmark,
  Receipt,
  Mail,
  TrendingUp,
  Target,
  Contact,
  Smartphone,
  Calculator,
  Disc,
  Video,
  Mic,
  FastForward,
  Download
} from "lucide-react";

interface ToolCardProps {
  tool: ToolItem;
}

export default function ToolCard({ tool }: ToolCardProps) {
  const renderIcon = () => {
    switch (tool.iconName) {
      case "Download":
        return <Download className="h-6 w-6" />;
      case "Video":
        return <Video className="h-6 w-6" />;
      case "Mic":
        return <Mic className="h-6 w-6" />;
      case "FastForward":
        return <FastForward className="h-6 w-6" />;
      case "Disc":
        return <Disc className="h-6 w-6" />;
      case "Calculator":
        return <Calculator className="h-6 w-6" />;
      case "Smartphone":
        return <Smartphone className="h-6 w-6" />;
      case "Mail":
        return <Mail className="h-6 w-6" />;
      case "TrendingUp":
        return <TrendingUp className="h-6 w-6" />;
      case "Target":
        return <Target className="h-6 w-6" />;
      case "Contact":
        return <Contact className="h-6 w-6" />;
      case "Ruler":
        return <Ruler className="h-6 w-6" />;
      case "Briefcase":
        return <Briefcase className="h-6 w-6" />;
      case "Landmark":
        return <Landmark className="h-6 w-6" />;
      case "Receipt":
        return <Receipt className="h-6 w-6" />;
      case "Tag":
        return <Tag className="h-6 w-6" />;
      case "Share2":
        return <Share2 className="h-6 w-6" />;
      case "Bot":
        return <Bot className="h-6 w-6" />;
      case "Network":
        return <Network className="h-6 w-6" />;
      case "Link2":
        return <Link2 className="h-6 w-6" />;
      case "Contrast":
        return <Contrast className="h-6 w-6" />;
      case "BoxSelect":
        return <BoxSelect className="h-6 w-6" />;
      case "Square":
        return <Square className="h-6 w-6" />;
      case "Move3d":
        return <Move3d className="h-6 w-6" />;
      case "Columns3":
        return <Columns3 className="h-6 w-6" />;
      case "LayoutGrid":
        return <LayoutGrid className="h-6 w-6" />;
      case "PaintBucket":
        return <PaintBucket className="h-6 w-6" />;
      case "Grid":
        return <Grid className="h-6 w-6" />;
      case "Globe":
        return <Globe className="h-6 w-6" />;
      case "FileCode2":
        return <FileCode2 className="h-6 w-6" />;
      case "Pipette":
        return <Pipette className="h-6 w-6" />;
      case "Stamp":
        return <Stamp className="h-6 w-6" />;
      case "Percent":
        return <Percent className="h-6 w-6" />;
      case "Calendar":
        return <Calendar className="h-6 w-6" />;
      case "Clock":
        return <Clock className="h-6 w-6" />;
      case "QrCode":
        return <QrCode className="h-6 w-6" />;
      case "KeyRound":
        return <KeyRound className="h-6 w-6" />;
      case "Palette":
        return <Palette className="h-6 w-6" />;
      case "Sparkles":
        return <Sparkles className="h-6 w-6" />;
      case "AlignLeft":
        return <AlignLeft className="h-6 w-6" />;
      case "Volume2":
        return <Volume2 className="h-6 w-6" />;
      case "Scissors":
        return <Scissors className="h-6 w-6" />;
      case "Music":
        return <Music className="h-6 w-6" />;
      case "Film":
        return <Film className="h-6 w-6" />;
      case "Camera":
        return <Camera className="h-6 w-6" />;
      case "Archive":
        return <Archive className="h-6 w-6" />;
      case "Table2":
        return <Table2 className="h-6 w-6" />;
      case "Code":
        return <Code className="h-6 w-6" />;
      case "FileSpreadsheet":
        return <FileSpreadsheet className="h-6 w-6" />;
      case "Link":
        return <LinkIcon className="h-6 w-6" />;
      case "Binary":
        return <Binary className="h-6 w-6" />;
      case "Search":
        return <Search className="h-6 w-6" />;
      case "FileCode":
        return <FileCode className="h-6 w-6" />;
      case "Combine":
        return <Combine className="h-6 w-6" />;
      case "Split":
        return <Split className="h-6 w-6" />;
      case "Layers":
        return <Layers className="h-6 w-6" />;
      case "Minimize2":
        return <Minimize2 className="h-6 w-6" />;
      case "FileImage":
        return <FileImage className="h-6 w-6" />;
      case "Repeat":
        return <Repeat className="h-6 w-6" />;
      case "Maximize":
        return <Maximize className="h-6 w-6" />;
      case "Crop":
        return <Crop className="h-6 w-6" />;
      case "FileText":
        return <FileText className="h-6 w-6" />;
      case "Type":
        return <Type className="h-6 w-6" />;
      case "Subtitles":
        return <Subtitles className="h-6 w-6" />;
      default:
        return <Code className="h-6 w-6" />;
    }
  };

  return (
    <Link
      href={tool.href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
    >
      {/* Top Pastel Header Block - Exactly matching reference image */}
      <div
        className={`flex h-40 w-full flex-col items-center justify-center p-6 text-center transition-colors ${tool.cardColor.headerBg}`}
      >
        <div className="mb-2 transition-transform duration-200 group-hover:scale-110">
          {renderIcon()}
        </div>
        <h3 className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
          {tool.name}
        </h3>
        {tool.badge && (
          <span className="mt-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-slate-700 shadow-2xs backdrop-blur-xs">
            {tool.badge}
          </span>
        )}
      </div>

      {/* Bottom Description Container */}
      <div className="flex flex-1 flex-col justify-between p-5 bg-white">
        <p className="text-xs leading-relaxed text-slate-600">
          {tool.shortDesc}
        </p>

        <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 opacity-90 group-hover:opacity-100 group-hover:text-blue-700">
          <span>Use Tool</span>
          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
