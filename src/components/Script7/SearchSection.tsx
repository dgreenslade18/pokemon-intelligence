import { useState, useEffect, useRef } from "react";
import { Button } from "../Button";
import { AutocompleteItem } from "./types";

interface SearchSectionProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onAnalyze: () => void;
  onSuggestionClick: (suggestion: AutocompleteItem) => void;
  loading: boolean;
  hideBackButton?: boolean;
  onBack?: () => void;
  // Graded search props
  searchType?: 'raw' | 'graded';
  onSearchTypeChange?: (type: 'raw' | 'graded') => void;
  gradingCompany?: string;
  onGradingCompanyChange?: (company: string) => void;
  grade?: string;
  onGradeChange?: (grade: string) => void;
}

export default function SearchSection({
  searchTerm,
  onSearchTermChange,
  onAnalyze,
  onSuggestionClick,
  loading,
  hideBackButton = false,
  onBack,
  searchType = 'raw',
  onSearchTypeChange,
  gradingCompany = '',
  onGradingCompanyChange,
  grade = '',
  onGradeChange,
}: SearchSectionProps) {
  const [autocompleteResults, setAutocompleteResults] = useState<
    AutocompleteItem[]
  >([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<"below" | "above">(
    "below"
  );
  const [maxDropdownHeight, setMaxDropdownHeight] = useState(320);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Calculate optimal dropdown position based on available space
  const calculateDropdownPosition = () => {
    if (!searchInputRef.current) return;

    const inputRect = searchInputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;

    const minSpaceNeeded = 200;
    const preferredDropdownHeight = 320;

    if (spaceBelow >= minSpaceNeeded) {
      setDropdownPosition("below");
      setMaxDropdownHeight(Math.min(preferredDropdownHeight, spaceBelow - 20));
    } else if (spaceAbove >= minSpaceNeeded) {
      setDropdownPosition("above");
      setMaxDropdownHeight(Math.min(preferredDropdownHeight, spaceAbove - 20));
    } else {
      if (spaceBelow >= spaceAbove) {
        setDropdownPosition("below");
        setMaxDropdownHeight(spaceBelow - 20);
      } else {
        setDropdownPosition("above");
        setMaxDropdownHeight(spaceAbove - 20);
      }
    }
  };

  // Debounced autocomplete search
  useEffect(() => {
    if ((searchTerm || "").length < 2) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      if ((searchTerm || "").length >= 2) {
        setAutocompleteLoading(true);
        setSelectedSuggestionIndex(-1);
        try {
          const response = await fetch(
            `/api/autocomplete?q=${encodeURIComponent(searchTerm || "")}`
          );
          if (response.ok) {
            const data = await response.json();
            setAutocompleteResults(data.suggestions || []);
            calculateDropdownPosition();
            setShowAutocomplete(true);
          }
        } catch (error) {
          console.error("Autocomplete error:", error);
        } finally {
          setAutocompleteLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Handle click outside autocomplete and window events
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    const handleWindowResize = () => {
      if (showAutocomplete) {
        calculateDropdownPosition();
      }
    };

    const handleScroll = () => {
      if (showAutocomplete) {
        calculateDropdownPosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleWindowResize);
    window.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [showAutocomplete]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showAutocomplete) return;
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < autocompleteResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        if (!showAutocomplete) return;
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (
          showAutocomplete &&
          selectedSuggestionIndex >= 0 &&
          autocompleteResults[selectedSuggestionIndex]
        ) {
          handleSuggestionClick(autocompleteResults[selectedSuggestionIndex]);
        } else {
          onAnalyze();
        }
        break;
      case "Escape":
        if (!showAutocomplete) return;
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: AutocompleteItem) => {
    let specificSearchTerm = suggestion.name || "";

    // Use fullCardNumber (e.g., "117/122") if available, otherwise fall back to regular number
    const cardNumber = suggestion.fullCardNumber || suggestion.number;
    if (cardNumber) {
      specificSearchTerm += ` ${cardNumber}`;
    }

    onSearchTermChange(specificSearchTerm);
    setShowAutocomplete(false);
    setAutocompleteResults([]);

    console.log(`🎯 Autocomplete selected: ${specificSearchTerm} - Ready for manual analysis`);
    // Removed automatic analysis trigger - users can now adjust advanced search options first
  };

  return (
    <div className="bento-card rounded-lg p-4 pb-4 md:mb-8 relative z-10 !overflow-visible">
      <div className="flex relative">
        <div className="relative w-full" ref={autocompleteRef}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter card name + number"
            className="w-full px-3 md:px-6 py-3 text-lg rounded-2xl border-2 border-black/10 dark:border-white/10 bg-white dark:bg-black/20 text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-colors"
            disabled={loading}
          />

          {/* Autocomplete Dropdown */}
          {showAutocomplete &&
            (autocompleteResults.length > 0 || autocompleteLoading) && (
              <div
                className={`absolute left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden ${
                  dropdownPosition === "above"
                    ? "bottom-full mb-2"
                    : "top-full mt-2"
                }`}
                style={{ maxHeight: `${maxDropdownHeight}px` }}
              >
                {autocompleteLoading ? (
                  <div className="p-4 text-center text-black/50 dark:text-white/50">
                    Searching...
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {autocompleteResults.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`p-4 cursor-pointer transition-colors border-b border-black/5 dark:border-white/5 last:border-b-0 ${
                          index === selectedSuggestionIndex
                            ? "bg-purple-50 dark:bg-purple-900/20"
                            : "hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {suggestion.image && (
                            <img
                              src={suggestion.image}
                              alt={suggestion.name}
                              className="w-12 h-16 object-contain rounded-lg"
                              onError={(e) => {
                                console.error('Image failed to load:', suggestion.image);
                                e.currentTarget.style.display = 'none';
                              }}
                              onLoad={() => console.log('Image loaded:', suggestion.image)}
                              crossOrigin="anonymous"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-black dark:text-white truncate">
                              {suggestion.name}
                            </div>
                            <div className="text-sm text-black/60 dark:text-white/60 flex items-center gap-2">
                              {suggestion.set && (
                                <span className="bg-black/10 dark:bg-white/10 px-2 py-1 rounded text-xs">
                                  {suggestion.set}
                                </span>
                              )}
                              {(suggestion.fullCardNumber ||
                                suggestion.number) && (
                                <span className="text-xs">
                            
                                  {suggestion.fullCardNumber ||
                                    suggestion.number}
                                </span>
                              )}
                            
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>

        <Button
          onClick={onAnalyze}
          disabled={loading || !(searchTerm || "").trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-black dark:text-white"
          color="search"
        >
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
            >
              <g transform="scale(-1,1) translate(-64,0)">
                <line
                  x1="42.4"
                  y1="42.4"
                  x2="58"
                  y2="58"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <g
                  className={loading ? "animate-spin" : ""}
                  style={{ transformOrigin: "30px 30px" }}
                >
                  <circle
                    cx="30"
                    cy="30"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />

                  <line
                    x1="14"
                    y1="30"
                    x2="46"
                    y2="30"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />

                  <circle
                    cx="30"
                    cy="30"
                    r="4"
                    fill="currentColor"
                    stroke="none"
                  />
                </g>
              </g>
            </svg>
          </Button>
        </div>
        
        {/* Advanced Search Section */}
        <div className="mt-4 space-y-3">
          <details className="group">
            <summary className="cursor-pointer text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
              Advanced Search Options
            </summary>
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
              {/* Search Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search Type
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="searchType"
                      value="raw"
                      checked={searchType === 'raw'}
                      onChange={(e) => onSearchTypeChange?.(e.target.value as 'raw' | 'graded')}
                      className="w-3 h-3 text-purple-600 mr-1"
                    />
                    Raw Cards
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="searchType"
                      value="graded"
                      checked={searchType === 'graded'}
                      onChange={(e) => onSearchTypeChange?.(e.target.value as 'raw' | 'graded')}
                      className="w-3 h-3 text-purple-600 mr-1"
                    />
                    Graded Cards
                  </label>
                </div>
              </div>

              {/* Grading Options */}
              {searchType === 'graded' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Grading Company
                    </label>
                    <select
                      value={gradingCompany}
                      onChange={(e) => onGradingCompanyChange?.(e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select</option>
                      <option value="PSA">PSA</option>
                      <option value="BGS">BGS</option>
                      <option value="CGC">CGC</option>
                      <option value="ACE">ACE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Grade
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => onGradeChange?.(e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select</option>
                      <option value="10">10</option>
                      <option value="9.5">9.5</option>
                      <option value="9">9</option>
                      <option value="8.5">8.5</option>
                      <option value="8">8</option>
                      <option value="7">7</option>
                      <option value="6">6</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    );
}
