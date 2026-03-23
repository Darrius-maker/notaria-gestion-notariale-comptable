// Validation utilities for forms

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (French format)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// SIRET validation (14 digits)
export const isValidSiret = (siret: string): boolean => {
  const cleanSiret = siret.replace(/\s/g, '');
  if (!/^\d{14}$/.test(cleanSiret)) return false;

  // Luhn algorithm check
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleanSiret[i], 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

// IBAN validation (basic)
export const isValidIBAN = (iban: string): boolean => {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleanIban)) return false;
  if (cleanIban.length < 15 || cleanIban.length > 34) return false;
  return true;
};

// Required field
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

// Min length
export const minLength = (value: string, min: number): boolean => {
  return value.length >= min;
};

// Max length
export const maxLength = (value: string, max: number): boolean => {
  return value.length <= max;
};

// Numeric value
export const isNumeric = (value: string): boolean => {
  return !isNaN(parseFloat(value)) && isFinite(Number(value));
};

// Positive number
export const isPositive = (value: number): boolean => {
  return value > 0;
};

// Date in future
export const isFutureDate = (date: string | Date): boolean => {
  const d = new Date(date);
  return d > new Date();
};

// Date in past
export const isPastDate = (date: string | Date): boolean => {
  const d = new Date(date);
  return d < new Date();
};

// Validate Tiers form
export const validateTiers = (data: {
  type: string;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string;
  siret?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!isRequired(data.nom)) {
    errors.push({ field: 'nom', message: 'Le nom est obligatoire' });
  } else if (!minLength(data.nom, 2)) {
    errors.push({ field: 'nom', message: 'Le nom doit contenir au moins 2 caractères' });
  }

  if (!isRequired(data.email)) {
    errors.push({ field: 'email', message: "L'email est obligatoire" });
  } else if (!isValidEmail(data.email)) {
    errors.push({ field: 'email', message: "L'email n'est pas valide" });
  }

  if (data.telephone && !isValidPhone(data.telephone)) {
    errors.push({ field: 'telephone', message: "Le numéro de téléphone n'est pas valide" });
  }

  if (data.type === 'MORALE' && data.siret) {
    if (!isValidSiret(data.siret)) {
      errors.push({ field: 'siret', message: "Le numéro SIRET n'est pas valide" });
    }
  }

  return { isValid: errors.length === 0, errors };
};

// Validate Dossier form
export const validateDossier = (data: {
  reference: string;
  objet: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!isRequired(data.reference)) {
    errors.push({ field: 'reference', message: 'La référence est obligatoire' });
  } else if (!minLength(data.reference, 3)) {
    errors.push({ field: 'reference', message: 'La référence doit contenir au moins 3 caractères' });
  }

  if (!isRequired(data.objet)) {
    errors.push({ field: 'objet', message: "L'objet est obligatoire" });
  } else if (!minLength(data.objet, 5)) {
    errors.push({ field: 'objet', message: "L'objet doit contenir au moins 5 caractères" });
  }

  return { isValid: errors.length === 0, errors };
};

// Validate Ecriture form
export const validateEcriture = (data: {
  libelle: string;
  montant: string;
  categorie: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!isRequired(data.libelle)) {
    errors.push({ field: 'libelle', message: 'Le libellé est obligatoire' });
  }

  if (!isRequired(data.montant)) {
    errors.push({ field: 'montant', message: 'Le montant est obligatoire' });
  } else if (!isNumeric(data.montant) || parseFloat(data.montant) <= 0) {
    errors.push({ field: 'montant', message: 'Le montant doit être un nombre positif' });
  }

  if (!isRequired(data.categorie)) {
    errors.push({ field: 'categorie', message: 'La catégorie est obligatoire' });
  }

  return { isValid: errors.length === 0, errors };
};

// Validate Facture form
export const validateFacture = (data: {
  tiersId: string;
  dateEcheance: string;
  lignes: Array<{ description: string; prixUnitaire: string }>;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!isRequired(data.tiersId)) {
    errors.push({ field: 'tiersId', message: 'Le client est obligatoire' });
  }

  if (!isRequired(data.dateEcheance)) {
    errors.push({ field: 'dateEcheance', message: "La date d'échéance est obligatoire" });
  } else if (!isFutureDate(data.dateEcheance)) {
    errors.push({ field: 'dateEcheance', message: "La date d'échéance doit être dans le futur" });
  }

  if (!data.lignes || data.lignes.length === 0) {
    errors.push({ field: 'lignes', message: 'Au moins une ligne est obligatoire' });
  } else {
    data.lignes.forEach((ligne, i) => {
      if (!isRequired(ligne.description)) {
        errors.push({ field: `lignes.${i}.description`, message: `Ligne ${i + 1}: description obligatoire` });
      }
      if (!isRequired(ligne.prixUnitaire) || !isNumeric(ligne.prixUnitaire) || parseFloat(ligne.prixUnitaire) <= 0) {
        errors.push({ field: `lignes.${i}.prixUnitaire`, message: `Ligne ${i + 1}: prix invalide` });
      }
    });
  }

  return { isValid: errors.length === 0, errors };
};

// Format validation errors for display
export const formatErrors = (errors: ValidationError[]): string => {
  return errors.map(e => e.message).join('. ');
};

// Get error for specific field
export const getFieldError = (errors: ValidationError[], field: string): string | undefined => {
  return errors.find(e => e.field === field)?.message;
};
