import { ArrowLeft, Heart, Info } from "lucide-react";
import { useState } from "react";

interface NameVariant {
  name: string;
  origin: string;
  meaning: string;
  popularity: string;
}

interface NameGroupPageProps {
  groupName: string;
  onBack: () => void;
  onViewNameDetail: (name: string) => void;
}

export function NameGroupPage({ groupName, onBack, onViewNameDetail }: NameGroupPageProps) {
  const [likedVariants, setLikedVariants] = useState<string[]>([]);

  // Mock data - in a real app this would come from props or API
  const variants: NameVariant[] = [
    {
      name: "Maria",
      origin: "Italian",
      meaning: "Star of the sea, beloved",
      popularity: "#1 in Italy, Spain",
    },
    {
      name: "Mariella",
      origin: "Italian",
      meaning: "Little Mary, star of the sea",
      popularity: "Top 200 in Italy",
    },
    {
      name: "Marisol",
      origin: "Spanish",
      meaning: "Mary of solitude, sea and sun",
      popularity: "Top 300 in Spain",
    },
    {
      name: "Mariana",
      origin: "Portuguese",
      meaning: "Star of the sea, grace",
      popularity: "Top 50 in Portugal, Brazil",
    },
    {
      name: "Marie",
      origin: "French",
      meaning: "Star of the sea, bitter",
      popularity: "Top 100 in France",
    },
    {
      name: "Maritza",
      origin: "Spanish",
      meaning: "Of the sea",
      popularity: "Top 500 in Latin America",
    },
    {
      name: "Marion",
      origin: "French",
      meaning: "Star of the sea",
      popularity: "Top 400 in France",
    },
    {
      name: "Marisa",
      origin: "Italian",
      meaning: "Of the sea",
      popularity: "Top 600 worldwide",
    },
    {
      name: "Marian",
      origin: "English",
      meaning: "Star of the sea",
      popularity: "Classic, timeless",
    },
    {
      name: "Marlene",
      origin: "German",
      meaning: "Star of the sea, from Magdala",
      popularity: "Vintage classic",
    },
  ];

  const toggleLike = (name: string) => {
    if (likedVariants.includes(name)) {
      setLikedVariants(likedVariants.filter(n => n !== name));
    } else {
      setLikedVariants([...likedVariants, name]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to swiping</span>
          </button>
          <div className="text-4xl mb-2">{groupName} Name Group</div>
          <div className="text-lg opacity-90">
            All variations and related names
          </div>
          {likedVariants.length > 0 && (
            <div className="mt-3 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
              ❤️ {likedVariants.length} variant{likedVariants.length !== 1 ? "s" : ""} liked
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6 text-gray-600">
          Explore all variations of {groupName}. Tap the heart to like, or the info icon to learn more.
        </div>

        {/* Variants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {variants.map((variant, index) => {
            const isLiked = likedVariants.includes(variant.name);
            return (
              <div
                key={index}
                className={`bg-white rounded-2xl shadow-lg p-6 transition-all ${
                  isLiked ? "ring-2 ring-pink-500" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-2xl text-gray-900 mb-1">{variant.name}</div>
                    <div className="text-sm text-gray-500">{variant.origin}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleLike(variant.name)}
                      className={`p-2 rounded-full transition-all ${
                        isLiked
                          ? "bg-pink-500 text-white"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? "fill-white" : ""}`} />
                    </button>
                    <button
                      onClick={() => onViewNameDetail(variant.name)}
                      className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-gray-500">Meaning</div>
                    <div className="text-gray-900">{variant.meaning}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Popularity</div>
                    <div className="text-gray-900">{variant.popularity}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
