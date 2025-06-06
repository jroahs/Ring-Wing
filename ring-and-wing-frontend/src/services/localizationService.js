export const getLocalizedText = (key, language = 'english') => {
  const localizedStrings = {
    orderAdded: {
      english: "I've started an order for you. You can say 'show my cart' anytime to see your current order.",
      tagalog: "Na-start ko na yung order mo. Sabihin mo lang 'show my cart' kung gusto mong makita yung order mo anytime."
    },
    noItemsInCart: {
      english: "You don't have any items in your order yet. Would you like to see our menu?",
      tagalog: "Wala ka pang items sa cart mo. Gusto mo bang makita yung menu namin?"
    },
    itemsInCart: {
      english: (count) => `You have ${count} item${count > 1 ? 's' : ''} in your order. You can view your cart below.`,
      tagalog: (count) => `May ${count} item${count > 1 ? 's' : ''} ka sa cart mo. Nasa baba yung order mo para ma-check mo.`
    },
    checkoutDetails: {
      english: "Great! I'll need a few details to process your order.",
      tagalog: "Perfect! Kailangan ko lang ng konting details para ma-process natin yung order mo."
    },
    orderCancelled: {
      english: "I've canceled your current order. Feel free to start over whenever you're ready!",
      tagalog: "Na-cancel ko na yung order mo. Just start over nalang kapag ready ka na ulit!"
    },
    noOrderToCancel: {
      english: "You don't have an active order to cancel.",
      tagalog: "Wala ka pang active order na pwedeng i-cancel."
    },
    itemAdded: {
      english: (name) => `Added ${name} to your order. Would you like anything else?`,
      tagalog: (name) => `Na-add ko na yung ${name} sa order mo. May gusto ka pa bang iba?`
    }
    // Add other keys as needed
  };

  return localizedStrings[key]?.[language] || localizedStrings[key]?.['english'] || `Missing translation for ${key}:${language}`;
};
