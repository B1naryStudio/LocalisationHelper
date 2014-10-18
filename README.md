LocalisationHelper
==================

1. Get information from spreadsheet, divided by languages
2. Perform search by languages, keys, translations
3. Change translation for any key
4. Generate JSON files
5. Track each translation changing and save it into DB (Mongo)
6. Get historical translation info (who and when has changed translation) with a possibility to restore previous value
7. Add new localisation keys
8. Validating the data (check keys consistence across all languages)
9. Creating zip with json files (this can be used for automatic localisation deployment from Jenkins)
10. Authorisation with separate roles (Admin, Translator, Visitor etc)
11. Backup and restoring the whole spreadsheet