pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Docker Image bauen') {
            steps {
                script {
                    // Baut das Docker-Image und nutzt die Build-Nummer als Tag
                    sh 'docker build -t meine-node-app:${BUILD_NUMBER} .'
                }
            }
        }
        stage('Test / Ausführen') {
            steps {
                script {
                    // Alter Test-Container stoppen/löschen, falls er noch da ist
                    sh 'docker rm -f test-container || true'
                    // Startet das Image als Container auf Port 3000
                    sh 'docker run -d -p 3000:3000 --name test-container meine-node-app:${BUILD_NUMBER}'
                }
            }
        }
    }
}
