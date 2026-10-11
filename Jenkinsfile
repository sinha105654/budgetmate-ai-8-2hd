pipeline {
  agent any

  environment {
    IMAGE = 'budgetmate-ai'
    TAG   = "${env.BUILD_NUMBER}"
  }

  stages {
    stage('Build') {
      steps {
        sh 'docker build --target runtime -t $IMAGE:$TAG -t $IMAGE:latest .'
      }
    }

    stage('Test') {
      steps {
        sh 'docker build --target test -t $IMAGE-test:$TAG .'
      }
    }

    stage('Security') {
      steps {
        sh '''
          mkdir -p reports
          docker run --rm $IMAGE-test:$TAG npm audit --omit=dev | tee reports/npm-audit-production.txt || true
          docker run --rm $IMAGE-test:$TAG npm audit | tee reports/npm-audit-all.txt || true
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache aquasec/trivy:latest image --severity HIGH,CRITICAL --no-progress $IMAGE:$TAG | tee reports/trivy-image.txt || true
        '''
        archiveArtifacts artifacts: 'reports/*', allowEmptyArchive: true
      }
    }
  }

  post {
    success { echo "Pipeline passed. Image: $IMAGE:$TAG" }
    failure { echo 'Pipeline failed. Check the stage that is red.' }
  }
}