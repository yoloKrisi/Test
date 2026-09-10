# GymLog

Eine responsive Gym-App auf Deutsch zum Verwalten von Übungen und Trainingssätzen.

## Starten

Die App benötigt keine Installation und keine externen Pakete. Öffne `index.html` direkt im Browser oder starte einen beliebigen lokalen statischen Server im Projektordner.

```bash
npm run check
```

Die Übungen und Trainingssätze werden automatisch im `localStorage` des Browsers gespeichert und bleiben beim Neuladen erhalten.

Trainingstage werden oben als Tabs verwaltet. Über das Plus entsteht ein neuer Tag, per Doppelklick lässt sich sein Name ändern. Neue Sätze verwenden automatisch das aktuelle Datum.

Im aktiven Trainingstag werden Übungen darunter hinzugefügt, entfernt und aufgeklappt. Immer nur eine Übung ist geöffnet. In der aufgeklappten Übung können Gewicht, Wiederholungen und die Anzahl der Sätze gespeichert werden; darunter erscheint der Verlauf der letzten Gewichte.