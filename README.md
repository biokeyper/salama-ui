# SafeGirls App UI

This is a React Native mobile app built with [Expo](https://expo.dev) and [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).  
It provides a trauma-informed, privacy-focused user interface for survivors to document and report sexual and gender-based violence (SGBV) incidents.

---

## Project Overview

This repository contains the **user interface (UI)** for SafeGirls.  
It is **not** the blockchain ("chain end") or smart contract code, but rather the mobile app that interacts with users and can connect to decentralized backends.

**Key Features:**
- **File-based routing** using [expo-router](https://docs.expo.dev/router/introduction)
- **Tab navigation** for easy access to Home, Record, and Explore screens
- **Audio recording** and text reporting flows
- **Safety-first design:** Emergency exit, safety checks, and trauma-informed language
- **Custom theming** and reusable UI components

---

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

---

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

---

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.