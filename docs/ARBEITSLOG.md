# Arbeitslog · Nyrathen v0.5

Ausgangsbasis: das bereitgestellte `Nyrathen-v0.4-Gesamtpaket.zip`. Originalarchive wurden nicht überschrieben. Oathenfell und andere Projekte wurden nicht verändert.

1. Vorhandenen vollständigen Stand entpackt, Netzwerk-/Client-/Server-/Buildquellen und offene Freigaben gelesen. Runtime benötigt keine nachinstallierten npm-Pakete.
2. Revisionsgenaue Differenzübertragung mit Vollzustands-Rückfall und separater SSE-Basis implementiert. Protokoll 2 bleibt, Codec wird ausdrücklich ausgehandelt. Eigenes Referenzmessverfahren und Decoderregressionen ergänzt.
3. Eingabekoaleszierung, sofortigen Neutralpfad und serverseitigen Eingabe-Watchdog integriert. 193 vorhandene Node-Tests liefen zunächst weiterhin erfolgreich.
4. Kontoblockierung, serverseitige Meldungen, begrenzte Aufbewahrung und lokale Betreiberbefehle eingebaut. Kein öffentliches Admin-API und kein externer Supportdienst angelegt. Profile/Datenbank-Backup weiterverwendet.
5. Ausrüstungsvergleich und stationäre Animation korrigiert; Verbindungspanel um echte Zähler ergänzt. Version 0.5.0 / native Buildnummer 5; Client erneut in beide Projekte synchronisiert.
6. Fünfminütigen echten lokalen 24-Client-Versuch ausgeführt. 14 Stream-Abbrüche wiederhergestellt; Datenvergleich 73,56 % weniger SSE-Anwendungsbytes. Performance-/Umgebungsgrenzen im Bericht ausdrücklich festgehalten.
7. Native Vorprüfung, eigene Android-Signing-Konfiguration und Xcode-Archiv-Einstieg ergänzt. Kein SDK/Xcode vorhanden, beide aktuellen nativen Versuche stoppten vor Kompilierung. Keine APK/AAB/IPA hergestellt und keine Cloud gestartet.
8. 223 Node-Tests und 634 aktuelle Chromium-Bedien-/Layoutprüfpunkte bestanden. Direkte Browser-HTTP-Navigation wurde durch die Umgebung blockiert, nicht umgangen oder als Erfolg protokolliert. Swift/XML-/Plist-Quelle separat syntaktisch geprüft.
9. Laufende echte Spielansichten über reguläre Eingaben aufgenommen; Dokumentation, Freigabestand und aktuelle maschinenlesbare Nachweise neu zusammengestellt. Alte v0.4-Prüfungen werden nicht als aktuelle Nachweise wiederverwendet.
10. Liefermanifest/ZIP erstellen und separat entpackt erneut mit Build-, Hash- und Funktionstests prüfen. Das Ergebnis der abschließenden Paketprüfung liegt als separate Paketpruefung-Datei neben der ZIP, damit die Prüfung nicht ihr eigenes Manifest verändert.

Weder private Schlüssel/Zugangsdaten noch echte Nutzerprofile gehören zur Lieferung. Die Moderations- und Login-Tests verwenden ausschließlich eigens erzeugte temporäre Testkonten.
