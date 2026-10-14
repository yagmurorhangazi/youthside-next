/**
 * [MODÜL: UI KIT İKON ADAPTÖRÜ]
 * Amaç: Değiştirilmeden tutulan upstream UI kit'in eski ikon sözleşmesini React Icons ile karşılamak.
 * Neden: Kit aynasına dokunmadan Lucide çalışma zamanı bağımlılığını kaldırır; uygulama ile kit aynı
 *        Phosphor görsel dilini kullanır. Bu dosya yalnızca yapılandırmadaki modül eşlemesiyle yüklenir.
 *
 * Kapsam: Kit'in `lucide-react`'tan import ettiği ikonların tamamı (story/fixture hariç). Kit
 * güncellenip yeni bir ikon eklenirse `npm run check` eksik dışa aktarımı hata olarak gösterir;
 * ikon buraya, aynı kavram için `icons.ts`'teki Phosphor varyantıyla eklenir.
 */

export type { IconType as LucideIcon } from 'react-icons';

export {
  // ── Durum & geri bildirim ──
  PiWarningCircleFill as AlertCircle,
  PiWarningOctagonFill as AlertOctagon,
  PiWarningFill as AlertTriangle,
  PiCheckBold as Check,
  PiCheckCircleFill as CheckCircle,
  PiCheckCircleFill as CheckCircle2,
  PiQuestionFill as HelpCircle,
  PiInfoFill as Info,
  PiSpinnerGapBold as Loader2,
  PiShieldWarningFill as ShieldAlert,
  PiWifiSlashBold as WifiOff,
  PiXBold as X,
  PiXCircleFill as XCircle,

  // ── Yön & gezinme ──
  PiArrowDownBold as ArrowDown,
  PiArrowUpBold as ArrowUp,
  PiArrowsDownUpBold as ArrowUpDown,
  PiCaretDownBold as ChevronDown,
  PiCaretLeftBold as ChevronLeft,
  PiCaretRightBold as ChevronRight,
  PiCaretUpDownBold as ChevronsUpDown,
  PiArrowSquareOutBold as ExternalLink,
  PiHouseFill as Home,
  PiSquaresFourFill as LayoutDashboard,
  PiListBold as Menu,
  PiDotsThreeBold as MoreHorizontal,

  // ── Aksiyonlar ──
  PiCopyBold as Copy,
  PiDownloadSimpleBold as Download,
  PiSignOutBold as LogOut,
  PiPlusBold as Plus,
  PiArrowClockwiseBold as RefreshCw,
  PiArrowCounterClockwiseBold as RotateCcw,
  PiMagnifyingGlassBold as Search,
  PiMagnifyingGlassMinusBold as SearchX,
  PiTrashBold as Trash2,
  PiCloudArrowUpFill as UploadCloud,
  PiMagnifyingGlassPlusBold as ZoomIn,
  PiMagnifyingGlassMinusBold as ZoomOut,

  // ── Zengin metin editörü ──
  PiTextAlignCenterBold as AlignCenter,
  PiTextAlignLeftBold as AlignLeft,
  PiTextAlignRightBold as AlignRight,
  PiTextBBold as Bold,
  PiTextHOneBold as Heading1,
  PiTextHTwoBold as Heading2,
  PiTextItalicBold as Italic,
  PiListBulletsBold as List,
  PiListNumbersBold as ListOrdered,
  PiQuotesFill as Quote,
  PiTextUnderlineBold as Underline,

  // ── Dosya & medya ──
  PiFileFill as File,
  PiFileXlsFill as FileSpreadsheet,
  PiFileTextFill as FileText,
  PiFilmStripFill as Film,
  PiFolderFill as Folder,
  PiFolderOpenFill as FolderOpen,
  PiFolderPlusFill as FolderPlus,
  PiImageFill as Image,
  PiVideoCameraFill as Video,

  // ── Alan kavramları ──
  PiBriefcaseFill as Briefcase,
  PiBuildingsFill as Building2,
  PiCalendarDotsFill as Calendar,
  PiChartLineUpFill as ChartNoAxesCombined,
  PiClipboardTextFill as ClipboardList,
  PiClockFill as Clock,
  PiStudentFill as GraduationCap,
  PiHeadsetFill as Headset,
  PiClockCounterClockwiseBold as History,
  PiKeyFill as KeyRound,
  PiLockKeyFill as Lock,
  PiEnvelopeSimpleBold as Mail,
  PiMapPinAreaFill as MapPin,
  PiMegaphoneFill as Megaphone,
  PiPhoneFill as Phone,
  PiGearSixFill as Settings,
  PiShieldFill as Shield,
  PiTrendDownBold as TrendingDown,
  PiTrendUpBold as TrendingUp,
  PiTrophyFill as Trophy,
  PiUserFill as User,
  PiUsersThreeFill as Users,
  PiWalletFill as Wallet,
} from 'react-icons/pi';
