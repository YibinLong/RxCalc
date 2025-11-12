#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceTestRunner {
  constructor() {
    this.results = {
      lighthouse: null,
      artillery: null,
      autocannon: null,
      timestamp: new Date().toISOString()
    };
    this.serverProcess = null;
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting development server...');
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });

      let serverStarted = false;
      const timeout = setTimeout(() => {
        if (!serverStarted) {
          reject(new Error('Server failed to start within 30 seconds'));
        }
      }, 30000);

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);
        if (output.includes('Local:') || output.includes('localhost:5173')) {
          if (!serverStarted) {
            serverStarted = true;
            clearTimeout(timeout);
            // Give server a moment to fully initialize
            setTimeout(() => {
              console.log('✅ Server started successfully');
              resolve();
            }, 3000);
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error(`Server error: ${data}`);
      });

      this.serverProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
      });
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      console.log('🛑 Stopping development server...');
      this.serverProcess.kill('SIGTERM');
      // Give it a moment to shut down gracefully
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.serverProcess.kill('SIGKILL');
    }
  }

  async runLighthouse() {
    return new Promise((resolve, reject) => {
      console.log('🔍 Running Lighthouse performance audit...');

      const lighthouse = spawn('npx', [
        'lighthouse',
        'http://localhost:5173',
        '--output=json',
        '--output-path=./performance-results/lighthouse.json',
        '--chrome-flags="--headless --no-sandbox"',
        '--quiet'
      ], { shell: true });

      lighthouse.stdout.on('data', (data) => {
        console.log(`Lighthouse: ${data.toString().trim()}`);
      });

      lighthouse.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Lighthouse audit completed');
          try {
            const report = JSON.parse(fs.readFileSync('./performance-results/lighthouse.json', 'utf8'));
            this.results.lighthouse = {
              performance: report.categories.performance.score * 100,
              firstContentfulPaint: report.audits['first-contentful-paint'].numericValue,
              largestContentfulPaint: report.audits['largest-contentful-paint'].numericValue,
              totalBlockingTime: report.audits['total-blocking-time'].numericValue,
              cumulativeLayoutShift: report.audits['cumulative-layout-shift'].numericValue,
              speedIndex: report.audits['speed-index'].numericValue
            };
            resolve(this.results.lighthouse);
          } catch (e) {
            reject(new Error(`Failed to parse Lighthouse results: ${e.message}`));
          }
        } else {
          reject(new Error(`Lighthouse exited with code ${code}`));
        }
      });
    });
  }

  async runArtillery() {
    return new Promise((resolve, reject) => {
      console.log('⚔️  Running Artillery load test...');

      const artillery = spawn('npx', [
        'artillery',
        'run',
        '--output',
        './performance-results/artillery.json',
        'performance-test.yml'
      ], { shell: true });

      let output = '';
      artillery.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text.trim());
      });

      artillery.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Artillery load test completed');

          // Parse results from output
          const lines = output.split('\n');
          const results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
            requestsPerSecond: 0,
            withinSLA: 0
          };

          for (const line of lines) {
            if (line.includes('http.requests.rate')) {
              const match = line.match(/(\d+\.\d+)/);
              if (match) results.requestsPerSecond = parseFloat(match[1]);
            }
            if (line.includes('http.response_time.mean')) {
              const match = line.match(/(\d+\.\d+)/);
              if (match) results.avgResponseTime = parseFloat(match[1]);
            }
            if (line.includes('http.response_time.p95')) {
              const match = line.match(/(\d+\.\d+)/);
              if (match) results.p95ResponseTime = parseFloat(match[1]);
            }
            if (line.includes('http.response_time.p99')) {
              const match = line.match(/(\d+\.\d+)/);
              if (match) results.p99ResponseTime = parseFloat(match[1]);
            }
            if (line.includes('http.codes.200')) {
              const match = line.match(/(\d+)/);
              if (match) results.successfulRequests = parseInt(match[1]);
            }
          }

          this.results.artillery = results;
          resolve(results);
        } else {
          reject(new Error(`Artillery exited with code ${code}`));
        }
      });
    });
  }

  async runAutocannon() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Running Autocannon benchmark...');

      const autocannon = spawn('npx', [
        'autocannon',
        '-c', '10',
        '-d', '30',
        '-j',
        './performance-results/autocannon.json',
        'http://localhost:5173/api/performance-test',
        '-m', 'POST',
        '-H', 'Content-Type: application/json',
        '-b', '{"drugInput":"Lisinopril 10mg","sig":"Take 1 tablet by mouth once daily","daysSupply":30}'
      ], { shell: true });

      let output = '';
      autocannon.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text.trim());
      });

      autocannon.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Autocannon benchmark completed');
          try {
            const report = JSON.parse(fs.readFileSync('./performance-results/autocannon.json', 'utf8'));
            this.results.autocannon = {
              requests: report.requests,
              throughput: report.throughput,
              latency: report.latency,
              errors: report.errors
            };
            resolve(this.results.autocannon);
          } catch (e) {
            reject(new Error(`Failed to parse Autocannon results: ${e.message}`));
          }
        } else {
          reject(new Error(`Autocannon exited with code ${code}`));
        }
      });
    });
  }

  generateReport() {
    const report = {
      timestamp: this.results.timestamp,
      summary: {
        lighthouseScore: this.results.lighthouse?.performance || 'N/A',
        avgResponseTime: this.results.artillery?.avgResponseTime || 'N/A',
        p95ResponseTime: this.results.artillery?.p95ResponseTime || 'N/A',
        requestsPerSecond: this.results.artillery?.requestsPerSecond || 'N/A',
        throughput: this.results.autocannon?.throughput?.average || 'N/A',
        withinSLA: this.results.artillery?.avgResponseTime < 2000 ? 'YES' : 'NO'
      },
      detailed: this.results
    };

    fs.writeFileSync('./performance-results/final-report.json', JSON.stringify(report, null, 2));

    console.log('\n📊 PERFORMANCE TEST REPORT');
    console.log('==========================');
    console.log(`Lighthouse Score: ${report.summary.lighthouseScore}/100`);
    console.log(`Average Response Time: ${report.summary.avgResponseTime}ms`);
    console.log(`95th Percentile Response Time: ${report.summary.p95ResponseTime}ms`);
    console.log(`Requests Per Second: ${report.summary.requestsPerSecond}`);
    console.log(`Autocannon Throughput: ${report.summary.throughput} req/s`);
    console.log(`Within 2s SLA: ${report.summary.withinSLA}`);

    if (report.summary.withinSLA === 'NO') {
      console.log('\n⚠️  WARNING: Application is not meeting the 2-second response time SLA!');
    } else {
      console.log('\n✅ Application is meeting the 2-second response time SLA');
    }

    return report;
  }

  async runAllTests() {
    try {
      // Create results directory
      if (!fs.existsSync('./performance-results')) {
        fs.mkdirSync('./performance-results', { recursive: true });
      }

      // Start server
      await this.startServer();

      // Run all performance tests
      await Promise.all([
        this.runLighthouse(),
        this.runArtillery(),
        this.runAutocannon()
      ]);

      // Generate final report
      const report = this.generateReport();

      return report;
    } catch (error) {
      console.error('❌ Performance testing failed:', error.message);
      throw error;
    } finally {
      await this.stopServer();
    }
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const runner = new PerformanceTestRunner();
  runner.runAllTests()
    .then(() => {
      console.log('\n✅ All performance tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceTestRunner;