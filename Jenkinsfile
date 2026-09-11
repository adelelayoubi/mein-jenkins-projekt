pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Docker Images bauen') {
            steps {
                script {
                    // Backend Image bauen
                    sh 'docker build -t calculator-backend:latest ./backend'
                    // Frontend Image bauen
                    sh 'docker build -t calculator-frontend:latest ./frontend'
                }
            }
        }

        stage('Test / Ausführen mit Docker Compose') {
            steps {
                script {
                    // Alte Container stoppen und entfernen falls vorhanden
                    sh 'docker-compose down || true'
                    // Neue Container im Hintergrund starten
                    sh 'docker-compose up -d'
                }
            }
        }
    }
}