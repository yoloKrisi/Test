# GymLog

Eine responsive Gym-App auf Deutsch zum Verwalten von Übungen und Trainingssätzen.

## Starten

Die App benötigt keine Installation und keine externen Pakete. Öffne `index.html` direkt im Browser oder starte einen beliebigen lokalen statischen Server im Projektordner.

```bash
npm run check
```

Die Übungen und Trainingssätze werden automatisch im `localStorage` des Browsers gespeichert und bleiben beim Neuladen erhalten.

Trainingspläne können mehrere Trainingstage enthalten. Das Gewichtdiagramm zeigt die Entwicklung pro Übung; neue Sätze verwenden automatisch das aktuelle Datum.

Im aktiven Trainingstag werden die Tage oben als Tabs angezeigt. Übungen lassen sich darunter hinzufügen, entfernen und aufklappen. In der aufgeklappten Übung können Gewicht, Wiederholungen und die Anzahl der Sätze gespeichert werden; darunter erscheint der Verlauf der letzten Gewichte.