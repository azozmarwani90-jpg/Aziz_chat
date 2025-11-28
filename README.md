# 🤖 Aziz AI Chat

A modern, full-stack AI chat application built with Node.js, Express, and OpenAI's GPT API. Features a beautiful dark-themed UI with support for text conversations and image analysis.

![Chat Interface](https://img.shields.io/badge/Status-Active-success)
![Node.js](https://img.shields.io/badge/Node.js-v14+-green)
![License](https://img.shields.io/badge/License-ISC-blue)

## ✨ Features

- 💬 Real-time AI chat conversations using OpenAI GPT
- 🖼️ Image upload and AI vision analysis
- 🎨 Modern, responsive dark-themed UI
- ⚡ Fast and lightweight Express backend
- 🔒 Secure API key management with environment variables
- 📱 Mobile-friendly responsive design
- 🎭 Typing indicators and smooth animations
- 📎 Drag-and-drop image support

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/aziz-ai-chat.git
   cd aziz-ai-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   ⚠️ **Important:** Never commit your `.env` file to GitHub!

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   
   Navigate to: `http://localhost:3000`

## 📁 Project Structure

```
aziz-ai-chat/
├── public/              # Frontend files
│   ├── index.html      # Main HTML file
│   ├── style.css       # Styles
│   └── script.js       # Client-side JavaScript
├── server.js           # Express backend server
├── package.json        # Project dependencies
├── .env               # Environment variables (not in Git)
├── .gitignore         # Git ignore file
└── README.md          # This file
```

## 🛠️ Technologies Used

- **Backend:**
  - Node.js
  - Express.js
  - OpenAI API (GPT-3.5-turbo & GPT-4o-mini with vision)
  - dotenv for environment variables
  - CORS for cross-origin requests

- **Frontend:**
  - Vanilla JavaScript
  - CSS3 with animations
  - Responsive design

## 🎯 Usage

### Text Chat
1. Type your message in the input field
2. Press Enter or click "Send"
3. The AI will respond in real-time

### Image Analysis
1. Click the 📎 paperclip icon
2. Select an image (PNG, JPG, etc.)
3. Add an optional message or question about the image
4. Send and the AI will analyze it

### Keyboard Shortcuts
- `Enter` - Send message
- `Shift + Enter` - New line in message

## ⚙️ Configuration

You can modify the following in `server.js`:

- **Port:** Change `const PORT = 3000;` to your preferred port
- **AI Model:** Change `model: "gpt-3.5-turbo"` to other OpenAI models
- **CORS:** Modify `app.use(cors())` for specific origins

## 🔒 Security Notes

- ✅ API keys are stored in `.env` file (not committed to Git)
- ✅ `.gitignore` prevents sensitive files from being uploaded
- ✅ CORS is enabled for development (configure for production)
- ⚠️ For production, add rate limiting and authentication

## 📝 Environment Variables

Create a `.env` file with:

```env
OPENAI_API_KEY=sk-proj-your-key-here
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👤 Author

**Aziz**

## 🙏 Acknowledgments

- OpenAI for their amazing GPT API
- The Node.js and Express communities

## 🐛 Known Issues

- Large images (>5MB) are rejected
- Only image files are supported for upload

## 🔮 Future Enhancements

- [ ] Chat history persistence
- [ ] Multiple conversation threads
- [ ] Voice input/output
- [ ] More AI models support
- [ ] User authentication
- [ ] Dark/Light theme toggle
- [ ] Export chat history

## 📞 Support

If you have any questions or run into issues, please open an issue on GitHub.

---

Made with ❤️ by Aziz
