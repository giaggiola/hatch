import { ArrowLeft, Heart, Share2, Sparkles } from "lucide-react";
import { useState } from "react";

interface NameDetailPageProps {
  name: string;
  origin: string;
  onBack: () => void;
}

export function NameDetailPage({ name, origin, onBack }: NameDetailPageProps) {
  const [isLiked, setIsLiked] = useState(false);

  // Mock data - in a real app this would come from props or API
  const nameData = {
    meaning: "Star of the sea, beloved one",
    etymology: "Derived from the Hebrew name Miriam, meaning 'sea of bitterness' or 'rebelliousness', though it has also been interpreted as 'star of the sea' in Latin tradition.",
    pronunciation: "mah-REE-ah",
    nameDay: "September 12th",
    famousPeople: [
      { name: "Maria Sharapova", description: "Russian tennis champion and Olympic medalist" },
      { name: "Maria Callas", description: "Legendary opera singer known as 'La Divina'" },
      { name: "Maria Montessori", description: "Italian educator who developed the Montessori method" },
      { name: "Maria Sklodowska-Curie", description: "Nobel Prize-winning physicist and chemist" },
    ],
    popularity: {
      global: "#3 worldwide",
      regions: [
        { region: "Italy", rank: "#1" },
        { region: "Spain", rank: "#1" },
        { region: "Portugal", rank: "#2" },
        { region: "Latin America", rank: "#1" },
      ],
    },
    variations: [
      { name: "Mariella", origin: "Italian" },
      { name: "Marisol", origin: "Spanish" },
      { name: "Mariana", origin: "Portuguese" },
      { name: "Marie", origin: "French" },
      { name: "Mary", origin: "English" },
      { name: "Maritza", origin: "Spanish" },
    ],
    characteristics: [
      "Compassionate and caring",
      "Strong leadership qualities",
      "Creative and artistic",
      "Natural nurturers",
    ],
    historicalSignificance: "Maria has been one of the most enduring names in Western culture, with roots in biblical tradition. It has been borne by queens, saints, artists, and leaders throughout history.",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white pb-12">
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="text-center">
            <div className="text-6xl mb-4">{name}</div>
            <div className="text-2xl opacity-90 mb-6">{origin}</div>
            <div className="text-xl opacity-80 mb-8">{nameData.meaning}</div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`px-8 py-3 rounded-full transition-all flex items-center gap-2 ${
                  isLiked
                    ? "bg-white text-pink-500"
                    : "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? "fill-pink-500" : ""}`} />
                <span>{isLiked ? "Liked" : "Like this name"}</span>
              </button>
              <button className="px-8 py-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Quick Facts Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-gray-500 text-sm mb-1">Pronunciation</div>
              <div className="text-gray-900">{nameData.pronunciation}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">Name Day</div>
              <div className="text-gray-900">{nameData.nameDay}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">Global Rank</div>
              <div className="text-gray-900">{nameData.popularity.global}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">Variations</div>
              <div className="text-gray-900">{nameData.variations.length}+</div>
            </div>
          </div>
        </div>

        {/* Etymology */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-pink-500" />
            <h2 className="text-2xl text-gray-900">Etymology & History</h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">{nameData.etymology}</p>
          <p className="text-gray-700 leading-relaxed">{nameData.historicalSignificance}</p>
        </div>

        {/* Popularity by Region */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl text-gray-900 mb-4">Popularity by Region</h2>
          <div className="space-y-3">
            {nameData.popularity.regions.map((region, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-pink-50 rounded-lg">
                <div className="text-gray-900">{region.region}</div>
                <div className="text-pink-600">{region.rank}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Famous People */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl text-gray-900 mb-4">Famous People Named {name}</h2>
          <div className="space-y-4">
            {nameData.famousPeople.map((person, index) => (
              <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <div className="text-gray-900 mb-1">{person.name}</div>
                  <div className="text-gray-600 text-sm">{person.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Characteristics */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl text-gray-900 mb-4">Common Characteristics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nameData.characteristics.map((trait, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-pink-50 rounded-lg">
                <div className="text-pink-500">✓</div>
                <div className="text-gray-900">{trait}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Related Names */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl text-gray-900 mb-4">Variations & Related Names</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {nameData.variations.map((variant, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="text-gray-900">{variant.name}</div>
                <div className="text-gray-500 text-sm">{variant.origin}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-12"></div>
    </div>
  );
}
