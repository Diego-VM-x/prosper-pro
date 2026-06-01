# Bugs - Prosper

## Web

### Solucionados
- _Ninguno por ahora_

### Pendientes
- _Ninguno por ahora_

---


### Solucionados
- **Firebase SDK no puede hacer fetch desde `file://`**: `signInWithPopup` y `createUserWithEmailAndPassword` fallan en APK → reemplazo por REST API directa (`lib/firebase-auth-rest.ts`) para operaciones de auth.
- **Firestore no ve datos del usuario**: `auth.currentUser` es null tras login REST → sincronizado con `updateCurrentUser(auth, userObj)` + `toJSON()` incluye `stsTokenManager`.

### Pendientes
- _Ninguno por ahora_

---


### Solucionados
- _Ninguno por ahora_

### Pendientes
- _Ninguno por ahora_
