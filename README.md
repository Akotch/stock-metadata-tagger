# Stock Metadata Assistant

An AI-powered application for automatically generating SEO-optimized metadata for stock photos using vision models. Upload images and get professional titles, alt-text, and keywords instantly.

## Features

- 🖼️ **Drag & Drop Upload**: Easy image upload with preview grid
- 🤖 **AI Metadata Generation**: Automatic SEO-optimized metadata using LM Studio vision models
- 📝 **Bulk Editing**: Multi-select operations for efficient keyword management
- 📊 **Export Options**: CSV and JSON export with platform-specific presets
- 🎯 **Preset System**: Pre-configured rules for Adobe Stock, Shutterstock, and Generic SEO
- 📈 **Progress Tracking**: Real-time processing status with visual indicators
- ✏️ **Inline Editing**: Edit metadata directly in the table view

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Express.js, SQLite, TypeScript
- **AI Integration**: LM Studio with Qwen2-VL/LLaVA vision models
- **UI Components**: Lucide React icons, custom components

## Prerequisites

- Node.js 18+ installed
- LM Studio (optional, for AI features)
- Compatible vision model (Qwen2-VL or LLaVA)

## Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd metadata_assistant

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
BACKEND_PORT=3001

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Development Settings
NEXT_PUBLIC_DEV_MODE=true
NEXT_PUBLIC_MOCK_API=false

# File Upload Settings
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_ALLOWED_TYPES=image/jpeg,image/png,image/webp

# Feature Flags
NEXT_PUBLIC_ENABLE_BULK_ACTIONS=true
NEXT_PUBLIC_ENABLE_EXPORT=true
NEXT_PUBLIC_ENABLE_PRESETS=true
```

Create a `.env` file in the `backend` directory:

```env
# Model Endpoint Configuration
MODEL_ENDPOINT_MODE=openai   # openai | custom

# OpenAI-Compatible Endpoint (LM Studio/vLLM)
LM_BASE=http://127.0.0.1:1234/v1
LM_MODEL=Qwen2.5-VL-7B-Instruct
LM_API_KEY=

# Custom Backend Endpoint
BACKEND_BASE=http://127.0.0.1:8000

# Request Configuration
REQUEST_TIMEOUT_MS=60000
REQUEST_RETRIES=2

# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./data/metadata_assistant.db

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# API Configuration
CORS_ORIGIN=http://localhost:3000

# Legacy LM Studio Configuration (for backward compatibility)
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=qwen2-vl
LM_STUDIO_TIMEOUT=30000
```

### 3. AI Model Setup

The application supports two AI backend modes:

#### Option A: OpenAI-Compatible Server (LM Studio/vLLM)

1. **LM Studio Setup**:
   - Download from [lmstudio.ai](https://lmstudio.ai)
   - Download a vision model (Qwen2-VL, LLaVA, etc.)
   - Start the local server on port 1234
   - Set `MODEL_ENDPOINT_MODE=openai` in your `.env`

2. **vLLM Setup**:
   - Install vLLM with vision support
   - Start server: `vllm serve model_name --port 1234`
   - Set `MODEL_ENDPOINT_MODE=openai` in your `.env`

#### Option B: Custom Backend

1. **FastAPI/Express Backend**:
   - Deploy your custom vision API
   - Ensure it has `/api/analyze` and `/healthz` endpoints
   - Set `MODEL_ENDPOINT_MODE=custom` in your `.env`
   - Update `BACKEND_BASE` to your API URL

#### Switching Between Modes

To switch between AI backends, simply change the `MODEL_ENDPOINT_MODE` environment variable:

```bash
# Use OpenAI-compatible server (LM Studio/vLLM)
MODEL_ENDPOINT_MODE=openai

# Use custom backend
MODEL_ENDPOINT_MODE=custom
```

No code changes required - restart the backend server to apply changes.

## Usage

### Starting the Application

1. **Start the Backend Server**:
```bash
cd backend
npm run dev
```
The backend will start on http://localhost:3001

2. **Start the Frontend** (in a new terminal):
```bash
npm run dev
```
The frontend will start on http://localhost:3000

### Using the Application

#### 1. Upload Images
- Drag and drop images onto the upload area
- Or click to select files from your computer
- Supported formats: JPEG, PNG, WebP
- Maximum file size: 10MB per image

#### 2. Automatic Processing
- Images are automatically processed upon upload
- AI generates SEO-optimized metadata:
  - **Alt Text**: Descriptive text for accessibility
  - **Title**: SEO-friendly title (max 70 characters)
  - **Keywords**: Relevant keywords (15-25 recommended)

#### 3. Review and Edit
- View generated metadata in the table
- Click any field to edit inline
- Use validation warnings to improve quality

#### 4. Bulk Operations
- Select multiple images using checkboxes
- **Add Keywords**: Bulk add keywords to selected images
- **Remove Keywords**: Bulk remove specific keywords
- **Find & Replace**: Replace text across all metadata fields

#### 5. Export Results
- Select images to export
- Choose format: CSV or JSON
- Apply preset rules (Adobe Stock, Shutterstock, Generic SEO)
- Download the generated file

### Preset Configurations

#### Adobe Stock
- 15-25 keywords required
- Excludes: "stock", "photo"
- Focus on commercial viability

#### Shutterstock
- 20-50 keywords allowed
- No keyword restrictions
- Emphasis on searchability

#### Generic SEO
- 10-30 keywords recommended
- Balanced approach for general use

## API Endpoints

### Frontend API Routes
- `POST /api/analyze` - Process uploaded images
- `POST /api/export` - Export metadata
- `GET /api/presets` - Get available presets

### Backend API Routes
- `POST /api/analyze` - Start image analysis
- `GET /api/analyze/:sessionId` - Get analysis results
- `POST /api/export` - Export session data
- `GET /api/presets` - Manage presets
- `GET /api/health` - Basic health check
- `GET /api/health/model` - Model endpoint health check
- `GET /health` - Legacy health check
- `GET /healthz` - Simple health check for custom backends

## Health Checks

The application provides several health check endpoints to monitor system status:

### Basic Health Check
```bash
curl http://localhost:3001/api/health
```
Returns server status, uptime, memory usage, and current endpoint mode.

### Model Endpoint Health Check
```bash
curl http://localhost:3001/api/health/model
```
Tests the configured AI model endpoint and returns detailed health information.

### Quick Health Check
```bash
curl http://localhost:3001/healthz
```
Simple "OK" response for load balancers and monitoring tools.

## Troubleshooting

### Common Issues

**Images not processing:**
- Check model endpoint health: `GET /api/health/model`
- Verify `MODEL_ENDPOINT_MODE` is set correctly
- For OpenAI mode: Ensure LM Studio/vLLM is running and accessible
- For custom mode: Check if your backend API is responding
- Check backend logs for connection errors
- Application will use fallback mock data if AI is unavailable

**Model endpoint connection issues:**
- Verify the endpoint URL in your `.env` file
- Check if the AI service is running on the specified port
- Test the health endpoint: `curl http://localhost:3001/api/health/model`
- Review timeout and retry settings in environment variables

**Upload failures:**
- Ensure file size is under 10MB
- Check file format (JPEG, PNG, WebP only)
- Verify upload directory permissions

**Export not working:**
- Check if images have generated metadata
- Ensure at least one image is selected
- Verify backend API connectivity

### Development

**Backend Development:**
```bash
cd backend
npm run dev     # Start with nodemon
npm run build   # Build TypeScript
npm start       # Production start
```

**Frontend Development:**
```bash
npm run dev     # Development server
npm run build   # Production build
npm start       # Production server
```

## Project Structure

```
metadata_assistant/
├── src/
│   ├── app/
│   │   ├── api/          # Next.js API routes
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Main application
│   └── components/
│       ├── BulkActions.tsx    # Bulk editing operations
│       ├── ImageGrid.tsx      # Image preview grid
│       ├── ImageUpload.tsx    # File upload component
│       ├── MetadataTable.tsx  # Editable metadata table
│       └── ProgressBar.tsx    # Processing progress
├── backend/
│   ├── src/
│   │   ├── database/     # Database models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── types/        # TypeScript types
│   ├── data/            # SQLite database
│   └── uploads/         # Uploaded files
└── public/              # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review backend logs for errors
3. Ensure all dependencies are installed
4. Verify LM Studio configuration

---

**Happy metadata generation! 🚀**
