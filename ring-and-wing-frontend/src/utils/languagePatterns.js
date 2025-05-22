// Language patterns for Ring & Wing Café chatbot
// This file contains common phrases and patterns for language detection

// Common Tagalog (Filipino) phrases for café interactions
const tagalogPhrases = {
  greetings: [
    "Magandang umaga", // Good morning
    "Magandang hapon", // Good afternoon
    "Magandang gabi", // Good evening
    "Kumusta", // How are you
    "Mabuhay" // Welcome/Hello
  ],
  
  questions: [
    "Ano ang specialty ninyo?", // What's your specialty?
    "Ano ang bestseller ninyo?", // What's your bestseller?
    "Magkano ang", // How much is
    "May available ba kayong", // Do you have available
    "Pwede bang umorder ng", // Can I order
    "Saan kayo matatagpuan?", // Where are you located?
    "Anong oras kayo nagsasara?", // What time do you close?
    "May wifi ba kayo?" // Do you have wifi?
  ],
  
  foodTerms: [
    "pagkain", // food
    "inumin", // drink
    "kape", // coffee
    "tsaa", // tea
    "mainit", // hot
    "malamig", // cold
    "matamis", // sweet
    "matabang", // bland
    "masarap", // delicious
    "presyo", // price
    "menu", // menu
    "almusal", // breakfast
    "tanghalian", // lunch
    "hapunan" // dinner
  ]
};

/**
 * Detects the language of user input text
 * @param {string} text - The text to analyze
 * @returns {string} The detected language: 'english' or 'tagalog'
 */
const detectLanguage = (text) => {
  if (!text) return 'english';
  const lowerText = text.toLowerCase();
  
  // Common Tagalog (Filipino) words and patterns
  const tagalogPatterns = [
    /kumusta/i, /kamusta/i, /ano/i, /saan/i, /kailan/i, /bakit/i, /paano/i, 
    /salamat/i, /maraming salamat/i, /po\b/i, /opo/i, /gusto ko/i, /pwede/i,
    /kape/i, /pagkain/i, /masarap/i, /gutom/i, /uhaw/i, /mainit/i, /malamig/i,
    /magkano/i, /presyo/i, /pesos/i, /tanghali/i, /umaga/i, /gabi/i,
    /magandang umaga/i, /magandang hapon/i, /magandang gabi/i, /mabuhay/i,
    /makakakuha/i, /makakaorder/i, /makakabili/i, /meron ba/i, /wala ba/i,
    /ngayon/i, /bukas/i, /kahapon/i, /ako/i, /ikaw/i, /siya/i, /tayo/i, /kami/i,
    /orderin/i, /umorder/i, /bili/i, /bumili/i, /kain/i, /kumain/i, /inom/i, /uminom/i,
    /lang\b/i, /yung\b/i, /na\b/i, /pa\b/i, /naman/i, /talaga/i, /kasi/i, /nga/i, /lamang/i,
    /marami/i, /konti/i, /rin/i, /din/i, /sige/i, /ayos/i, /paki/i, /pakiusap/i,
    /malamang/i, /siguro/i, /baka/i, /sarap/i, /dito/i, /doon/i, /diyan/i, /atin/i
  ];

  // Count pattern matches for Tagalog language detection
  let tagalogCount = 0;
  
  // Check for Tagalog patterns
  for (const pattern of tagalogPatterns) {
    if (pattern.test(lowerText)) tagalogCount++;
  }

  // Detect Tagalog text
  if (tagalogCount >= 1) {
    return 'tagalog';
  }
    
  // For very short inputs like "ikaw," "ako," etc., check for exact matches
  const shortTagalogWords = ["ikaw", "ako", "siya", "kain", "inom", "gusto", "ayaw", "dito", "diyan", "po", "opo", "salamat", "kamusta", "kumusta"];
  if (shortTagalogWords.includes(lowerText.trim())) {
    return 'tagalog';
  }
  
  // Default to English if no patterns match
  return 'english';
};

export { tagalogPhrases, detectLanguage };
