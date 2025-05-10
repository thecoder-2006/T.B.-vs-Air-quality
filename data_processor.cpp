#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif
#include <vector>
#include <cmath>
#include <algorithm>

// Structure to hold yearly global data
struct YearlyData {
    double incidence;
    double pm25;
};

// Function to calculate Pearson correlation coefficient
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    double calculateCorrelation(double* incidence, double* pm25, int size) {
        if (size <= 1) return 0.0;

        double meanX = 0.0, meanY = 0.0;
        for (int i = 0; i < size; i++) {
            meanX += incidence[i];
            meanY += pm25[i];
        }
        meanX /= size;
        meanY /= size;

        double cov = 0.0, varX = 0.0, varY = 0.0;
        for (int i = 0; i < size; i++) {
            double dx = incidence[i] - meanX;
            double dy = pm25[i] - meanY;
            cov += dx * dy;
            varX += dx * dx;
            varY += dy * dy;
        }

        if (varX == 0 || varY == 0) return 0.0;
        return cov / std::sqrt(varX * varY);
    }
}

// Function to normalize data to [0, 1]
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void normalizeData(double* data, int size, double* result) {
        if (size == 0) return;

        double minVal = *std::min_element(data, data + size);
        double maxVal = *std::max_element(data, data + size);
        double range = maxVal - minVal;

        if (range == 0) {
            for (int i = 0; i < size; i++) {
                result[i] = 0.0;
            }
            return;
        }

        for (int i = 0; i < size; i++) {
            result[i] = (data[i] - minVal) / range;
        }
    }
}

// Function to process global data and return correlation and normalized values
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void processGlobalData(double* incidence, double* pm25, int size, double* corr, double* normIncidence, double* normPm25) {
        *corr = calculateCorrelation(incidence, pm25, size);
        normalizeData(incidence, size, normIncidence);
        normalizeData(pm25, size, normPm25);
    }
}