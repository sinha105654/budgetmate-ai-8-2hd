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
  }

  post {
    success { echo "Pipeline passed. Image: $IMAGE:$TAG" }
    failure { echo 'Pipeline failed. Check the stage that is red.' }
  }
}