// ══════════════════════════════════════════
// HASH SIMPLE — repris à l'identique du frontend (main.js)
// ══════════════════════════════════════════
// ⚠️ Ce hash N'EST PAS sécurisé cryptographiquement (pas de salage,
// collisions faciles, réversible par force brute rapide). Il est conservé
// ici uniquement pour rester compatible avec les mots de passe déjà
// enregistrés dans Firestore avec cette méthode.
// Si tu migres vers bcrypt plus tard, prévoir un script de migration
// des mots de passe existants (ré-hash au prochain login réussi par ex.)

function hashSimple(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h.toString(16);
}

module.exports = { hashSimple };
