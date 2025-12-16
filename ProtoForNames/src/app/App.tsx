import { NameCard } from "./components/NameCard";
import { NameDetailModal } from "./components/NameDetailModal";
import { NameGroupPage } from "./components/NameGroupPage";
import { NameDetailPage } from "./components/NameDetailPage";
import { useState } from "react";
import { Heart, X, RotateCcw } from "lucide-react";

type Page = "swipe" | "group" | "detail";

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [likedNames, setLikedNames] = useState<string[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<number, string[]>>({});
  const [currentPage, setCurrentPage] = useState<Page>("swipe");
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [selectedDetailName, setSelectedDetailName] = useState("");
  const [showHint, setShowHint] = useState(true);

  const names = [
    {
      name: "Maria",
      origin: "Italian",
      variants: [
        { name: "Maria", origin: "Italian" },
        { name: "Mariella", origin: "Italian" },
        { name: "Marisol", origin: "Spanish" },
        { name: "Mariana", origin: "Portuguese" },
        { name: "Marie", origin: "French" },
        { name: "Maritza", origin: "Spanish" },
      ],
    },
    {
      name: "Sofia",
      origin: "Greek",
      variants: [
        { name: "Sofia", origin: "Greek" },
        { name: "Sophie", origin: "French" },
        { name: "Sophia", origin: "English" },
        { name: "Sofie", origin: "Dutch" },
        { name: "Zofia", origin: "Polish" },
        { name: "Sofiya", origin: "Russian" },
      ],
    },
    {
      name: "Isabella",
      origin: "Spanish",
      variants: [
        { name: "Isabella", origin: "Spanish" },
        { name: "Isabel", origin: "Spanish" },
        { name: "Isabelle", origin: "French" },
        { name: "Bella", origin: "Italian" },
        { name: "Eliza", origin: "English" },
        { name: "Izabela", origin: "Polish" },
      ],
    },
    {
      name: "Olivia",
      origin: "English",
      variants: [
        { name: "Olivia", origin: "English" },
        { name: "Olive", origin: "English" },
        { name: "Livia", origin: "Latin" },
        { name: "Liv", origin: "Nordic" },
        { name: "Oliva", origin: "Spanish" },
        { name: "Olivie", origin: "French" },
      ],
    },
  ];

  const currentName = names[currentIndex];

  // Initialize selected variants with the primary name selected
  if (currentIndex < names.length && !selectedVariants[currentIndex]) {
    setSelectedVariants({
      ...selectedVariants,
      [currentIndex]: [currentName.name]
    });
  }

  const handleLike = () => {
    const selected = selectedVariants[currentIndex] || [currentName.name];
    setLikedNames([...likedNames, ...selected]);
    if (currentIndex < names.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDislike = () => {
    if (currentIndex < names.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1;
      const previousSelected = selectedVariants[previousIndex] || [];
      setCurrentIndex(previousIndex);
      setLikedNames(likedNames.filter(name => !previousSelected.includes(name)));
    }
  };

  const handleInfo = () => {
    setShowModal(true);
  };

  const handleToggleVariant = (variantName: string) => {
    const current = selectedVariants[currentIndex] || [currentName.name];
    const updated = current.includes(variantName)
      ? current.filter(n => n !== variantName)
      : [...current, variantName];
    
    setSelectedVariants({
      ...selectedVariants,
      [currentIndex]: updated
    });
  };

  const handleExploreGroup = () => {
    setSelectedGroupName(currentName.name);
    setCurrentPage("group");
  };

  const handleViewFullPage = () => {
    setSelectedDetailName(currentName.name);
    setShowModal(false);
    setCurrentPage("detail");
  };

  const handleViewNameDetailFromGroup = (name: string) => {
    setSelectedDetailName(name);
    setCurrentPage("detail");
  };

  // Render different pages based on currentPage state
  if (currentPage === "group") {
    return (
      <NameGroupPage
        groupName={selectedGroupName}
        onBack={() => setCurrentPage("swipe")}
        onViewNameDetail={handleViewNameDetailFromGroup}
      />
    );
  }

  if (currentPage === "detail") {
    return (
      <NameDetailPage
        name={selectedDetailName}
        origin={currentName?.origin || "Italian"}
        onBack={() => {
          // Go back to group page if we came from there, otherwise to swipe
          if (selectedGroupName) {
            setCurrentPage("group");
          } else {
            setCurrentPage("swipe");
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex flex-col">
      {/* First-time Hint */}
      {showHint && currentIndex === 0 && (
        <div className="fixed top-20 left-0 right-0 z-50 flex justify-center px-4">
          <div className="bg-pink-500 text-white px-6 py-4 rounded-2xl shadow-xl max-w-md">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <div className="mb-2">Tap variants you like, then swipe right to save them!</div>
                <button
                  onClick={() => setShowHint(false)}
                  className="text-sm bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 text-center">
        <div className="text-3xl mb-2">✨ NameMatch</div>
        <div className="text-gray-600">Swipe to find your perfect baby name</div>
        {likedNames.length > 0 && (
          <div className="mt-2 text-pink-600">
            ❤️ {likedNames.length} name{likedNames.length !== 1 ? "s" : ""} liked
          </div>
        )}
      </div>

      {/* Card Stack */}
      <div className="flex-1 flex items-center justify-center px-4 relative">
        {currentIndex < names.length ? (
          <div className="relative w-full max-w-sm h-[600px]">
            <NameCard
              key={currentIndex}
              {...currentName}
              onLike={handleLike}
              onDislike={handleDislike}
              onInfo={handleInfo}
              onExploreGroup={handleExploreGroup}
              selectedVariants={selectedVariants[currentIndex] || [currentName.name]}
              onToggleVariant={handleToggleVariant}
            />
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-2xl mb-4">All done!</div>
            <div className="text-gray-600 mb-6">
              You've reviewed all names. You liked: {[...new Set(likedNames)].join(", ")}
            </div>
            <button
              onClick={() => {
                setCurrentIndex(0);
                setLikedNames([]);
                setSelectedVariants({});
              }}
              className="bg-pink-500 text-white px-6 py-3 rounded-full hover:bg-pink-600 transition-colors"
            >
              Start Over
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {currentIndex < names.length && (
        <div className="p-6 flex justify-center items-center gap-6">
          <button
            onClick={handleDislike}
            className="bg-white p-5 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
          >
            <X className="w-8 h-8 text-red-500" />
          </button>

          <button
            onClick={handleUndo}
            disabled={currentIndex === 0}
            className="bg-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-6 h-6 text-gray-500" />
          </button>

          <button
            onClick={handleLike}
            className="bg-white p-5 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
          >
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
          </button>
        </div>
      )}

      {/* Name Detail Modal */}
      <NameDetailModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        name={currentName?.name || ""}
        origin={currentName?.origin || ""}
        onViewFullPage={handleViewFullPage}
      />
    </div>
  );
}