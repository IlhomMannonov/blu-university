import http from 'http';
import app from './app';
import config from './config/config';

const index = http.createServer(app);

index.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});

