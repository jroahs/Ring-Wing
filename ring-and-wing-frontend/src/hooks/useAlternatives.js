import { useState, useCallback } from 'react';

export const useAlternatives = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    originalItem: null,
    alternatives: [],
    recommendedAlternative: null,
    loading: false
  });

  const fetchAlternatives = useCallback(async (itemId) => {
    try {
      const response = await fetch(`/api/menu/${itemId}/alternatives`);
      if (!response.ok) {
        throw new Error('Failed to fetch alternatives');
      }
      const data = await response.json();
      return {
        alternatives: data.alternatives || [],
        recommendedAlternative: data.recommendedAlternative || null
      };
    } catch (error) {
      console.error('Error fetching alternatives:', error);
      return {
        alternatives: [],
        recommendedAlternative: null
      };
    }
  }, []);

  const showAlternatives = useCallback(async (originalItem) => {
    setModalState({
      isOpen: true,
      originalItem,
      alternatives: [],
      recommendedAlternative: null,
      loading: true
    });

    const { alternatives, recommendedAlternative } = await fetchAlternatives(originalItem._id);
    
    setModalState(prev => ({
      ...prev,
      alternatives,
      recommendedAlternative,
      loading: false
    }));
  }, [fetchAlternatives]);

  const hideAlternatives = useCallback(() => {
    setModalState({
      isOpen: false,
      originalItem: null,
      alternatives: [],
      recommendedAlternative: null,
      loading: false
    });
  }, []);

  return {
    modalState,
    showAlternatives,
    hideAlternatives
  };
};
