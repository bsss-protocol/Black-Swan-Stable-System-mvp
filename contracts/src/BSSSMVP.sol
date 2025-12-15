// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 导入必要的库和接口
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BSSS MVP核心合约
 * @dev 实现BSSS最小可行产品的核心功能：
 * 1. 用户存入USDC参与稳定性挖矿
 * 2. 通过Chainlink预言机监控ETH/USD价格
 * 3. 当价格跌至预设防线时自动在Uniswap V3挂单
 * 4. 成交后用户可提取分配的ETH
 * @notice 此合约为MVP版本，已包含重入攻击防护和权限管理
 */
contract BSSSMVP is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // =========================== 常量定义 ===========================
    
    /** @dev 防御线比例常量（80% = 8000/10000） */
    uint256 public constant DEFENSE_RATIO = 8000;
    
    /** @dev 计算精度常量 */
    uint256 public constant PRECISION = 10000;
    
    /** @dev Chainlink价格精度（ETH/USD价格为8位小数） */
    uint256 private constant CHAINLINK_PRICE_DECIMALS = 8;
    
    /** @dev USDC代币精度（6位小数） */
    uint256 private constant USDC_DECIMALS = 6;
    
    /** @dev Uniswap V3交易手续费等级（0.30%） */
    uint24 public constant UNISWAP_FEE = 3000;
    
    // =========================== 状态变量 ===========================
    
    /** @dev Chainlink ETH/USD预言机 */
    AggregatorV3Interface public immutable priceFeed;
    
    /** @dev USDC代币合约 */
    IERC20 public immutable usdcToken;
    
    /** @dev 合约持有的总USDC数量 */
    uint256 public totalUsdcDeposited;
    
    /** @dev 合约持有的总ETH数量 */
    uint256 public totalEthBalance;
    
    /** @dev 当前防御线触发价格（USD，8位小数） */
    uint256 public currentDefensePrice;
    
    /** @dev 防御线是否已触发 */
    bool public defenseLineTriggered;
    
    /** @dev 订单是否已执行 */
    bool public orderExecuted;
    
    /** @dev 防御线触发时间戳 */
    uint256 public triggerTimestamp;
    
    /** @dev 订单执行时间戳 */
    uint256 public executionTimestamp;
    
    /** @dev Uniswap V3路由器合约地址 */
    address public uniswapRouter;
    
    // =========================== 结构体定义 ===========================
    
    /**
     * @dev 用户存款信息结构体
     */
    struct UserInfo {
        uint256 usdcAmount;      // 存入的USDC数量
        uint256 ethShare;        // 应得的ETH份额
        uint256 depositTime;     // 存款时间戳
        bool hasWithdrawn;       // 是否已提取ETH
    }
    
    // =========================== 映射和数组 ===========================
    
    /** @dev 用户地址到存款信息的映射 */
    mapping(address => UserInfo) public userInfo;
    
    /** @dev 存款用户地址列表（用于批量操作） */
    address[] public depositors;
    
    // =========================== 事件定义 ===========================
    
    /** @dev 用户存款事件 */
    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    
    /** @dev 防御线触发事件 */
    event DefenseLineTriggered(uint256 defensePrice, uint256 currentPrice, uint256 timestamp);
    
    /** @dev 订单执行事件 */
    event OrderExecuted(uint256 ethPurchased, uint256 usdcSpent, uint256 timestamp);
    
    /** @dev ETH提取事件 */
    event ETHWithdrawn(address indexed user, uint256 amount, uint256 timestamp);
    
    /** @dev 紧急停止事件 */
    event EmergencyStop(bool stopped, uint256 timestamp);
    
    /** @dev 资金提取事件（仅所有者） */
    event FundsWithdrawn(address indexed token, uint256 amount, uint256 timestamp);
    
    // =========================== 构造函数 ===========================
    
    /**
     * @dev 构造函数，初始化合约
     * @param _priceFeed Chainlink预言机地址
     * @param _usdcAddress USDC代币合约地址
     * @param _uniswapRouter Uniswap V3路由器地址
     * @notice 部署时设置所有必要的合约地址
     */
    constructor(
        address _priceFeed,
        address _usdcAddress,
        address _uniswapRouter
    ) Ownable(msg.sender) {
        require(_priceFeed != address(0), "Invalid price feed address");
        require(_usdcAddress != address(0), "Invalid USDC address");
        require(_uniswapRouter != address(0), "Invalid Uniswap router");
        
        priceFeed = AggregatorV3Interface(_priceFeed);
        usdcToken = IERC20(_usdcAddress);
        uniswapRouter = _uniswapRouter;
        
        // 初始化防御线价格
        _updateDefenseLinePrice();
    }
    
    // =========================== 核心功能函数 ===========================
    
    /**
     * @dev 用户存入USDC
     * @param amount 存入的USDC数量（6位小数）
     * @notice 用户需先授权合约使用USDC，采用检查-生效-交互模式防止重入[citation:4]
     */
    function depositUSDC(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(!defenseLineTriggered, "Defense line already triggered");
        
        // 检查：验证用户余额和授权
        uint256 userBalance = usdcToken.balanceOf(msg.sender);
        require(userBalance >= amount, "Insufficient USDC balance");
        
        uint256 allowance = usdcToken.allowance(msg.sender, address(this));
        require(allowance >= amount, "Insufficient allowance");
        
        // 生效：更新用户信息和总存款
        UserInfo storage user = userInfo[msg.sender];
        
        if (user.usdcAmount == 0) {
            // 新用户，添加到列表
            depositors.push(msg.sender);
        }
        
        user.usdcAmount += amount;
        user.depositTime = block.timestamp;
        
        totalUsdcDeposited += amount;
        
        // 交互：从用户转移USDC到合约
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposited(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev 获取当前防御线触发价格
     * @return defensePrice 防御线触发价格（美元，8位小数）
     * @notice 基于当前Chainlink价格和预设比例计算
     */
    function getDefenseLinePrice() external view returns (uint256) {
        return currentDefensePrice;
    }
    
    /**
     * @dev 检查并触发防御线
     * @return triggered 是否成功触发防御线
     * @notice 任何人都可以调用，当市场价格低于防御线价格时触发
     */
    function checkAndTriggerDefenseLine() external returns (bool) {
        require(!defenseLineTriggered, "Defense line already triggered");
        require(totalUsdcDeposited > 0, "No USDC deposited");
        
        uint256 currentPrice = _getCurrentETHPrice();
        uint256 defensePrice = currentDefensePrice;
        
        if (currentPrice <= defensePrice) {
            // 触发防御线
            defenseLineTriggered = true;
            triggerTimestamp = block.timestamp;
            
            emit DefenseLineTriggered(defensePrice, currentPrice, block.timestamp);
            return true;
        }
        
        return false;
    }
    
    /**
     * @dev 执行防御线订单
     * @notice 在Uniswap V3执行购买ETH的订单，使用精确输入交易[citation:10]
     */
    function executeDefenseLineOrder() external nonReentrant onlyOwner {
        require(defenseLineTriggered, "Defense line not triggered");
        require(!orderExecuted, "Order already executed");
        require(totalUsdcDeposited > 0, "No USDC to execute order");
        
        // 计算要花费的USDC数量（全部可用资金）
        uint256 usdcToSpend = usdcToken.balanceOf(address(this));
        require(usdcToSpend > 0, "No USDC balance");
        
        // 授权Uniswap路由器使用USDC
        usdcToken.safeApprove(uniswapRouter, usdcToSpend);
        
        // 设置Uniswap V3交易参数[citation:10]
        bytes memory path = abi.encodePacked(
            address(usdcToken), // tokenIn: USDC
            UNISWAP_FEE,        // 手续费率: 0.30%
            address(0)          // tokenOut: ETH（零地址表示原生ETH）
        );
        
        // 执行交易（此处为简化实现，实际需要实现ISwapRouter接口）
        uint256 ethReceived = _executeSwap(usdcToSpend, path);
        
        // 更新状态
        totalEthBalance = ethReceived;
        orderExecuted = true;
        executionTimestamp = block.timestamp;
        
        // 计算每个用户的ETH份额
        _calculateUserShares();
        
        emit OrderExecuted(ethReceived, usdcToSpend, block.timestamp);
    }
    
    /**
     * @dev 用户提取ETH
     * @notice 用户只能提取已分配给他们的ETH份额
     */
    function withdrawETH() external nonReentrant {
        require(orderExecuted, "Order not executed yet");
        
        UserInfo storage user = userInfo[msg.sender];
        require(user.usdcAmount > 0, "No deposit found");
        require(user.ethShare > 0, "No ETH share available");
        require(!user.hasWithdrawn, "ETH already withdrawn");
        
        uint256 ethToWithdraw = user.ethShare;
        
        // 生效：更新用户状态
        user.hasWithdrawn = true;
        user.ethShare = 0;
        
        // 交互：转移ETH给用户
        (bool success, ) = payable(msg.sender).call{value: ethToWithdraw}("");
        require(success, "ETH transfer failed");
        
        emit ETHWithdrawn(msg.sender, ethToWithdraw, block.timestamp);
    }
    
    // =========================== 视图函数 ===========================
    
    /**
     * @dev 获取当前ETH价格
     * @return 当前ETH价格（美元，8位小数）
     */
    function getCurrentETHPrice() external view returns (uint256) {
        return _getCurrentETHPrice();
    }
    
    /**
     * @dev 获取用户USDC存款余额
     * @param user 用户地址
     * @return 用户的USDC存款余额
     */
    function getUserUSDCBalance(address user) external view returns (uint256) {
        return userInfo[user].usdcAmount;
    }
    
    /**
     * @dev 获取用户ETH余额
     * @param user 用户地址
     * @return 用户的ETH余额
     */
    function getUserETHBalance(address user) external view returns (uint256) {
        return userInfo[user].ethShare;
    }
    
    /**
     * @dev 获取合约USDC总余额
     * @return 合约持有的USDC总量
     */
    function getContractUSDCBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }
    
    /**
     * @dev 获取合约ETH总余额
     * @return 合约持有的ETH总量
     */
    function getContractETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev 获取防御线状态
     * @return isTriggered 是否已触发
     * @return isExecuted 是否已执行
     * @return defensePrice 防御线价格
     * @return triggerTime 触发时间
     */
    function getDefenseLineStatus() external view returns (
        bool isTriggered,
        bool isExecuted,
        uint256 defensePrice,
        uint256 triggerTime
    ) {
        return (
            defenseLineTriggered,
            orderExecuted,
            currentDefensePrice,
            triggerTimestamp
        );
    }
    
    /**
     * @dev 计算用户应得的ETH比例
     * @param user 用户地址
     * @return 用户应得的ETH比例（基于USDC存款）
     */
    function calculateUserShare(address user) external view returns (uint256) {
        if (totalUsdcDeposited == 0) return 0;
        
        UserInfo storage userInfo_ = userInfo[user];
        return (userInfo_.usdcAmount * totalEthBalance) / totalUsdcDeposited;
    }
    
    // =========================== 管理员函数 ===========================
    
    /**
     * @dev 更新Uniswap路由器地址
     * @param newRouter 新的Uniswap V3路由器地址
     * @notice 仅所有者可调用
     */
    function updateUniswapRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "Invalid router address");
        uniswapRouter = newRouter;
    }
    
    /**
     * @dev 提取意外发送的代币
     * @param token 代币地址
     * @param amount 提取数量
     * @notice 仅所有者可调用，用于提取意外发送的代币
     */
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(usdcToken), "Cannot recover USDC");
        
        if (token == address(0)) {
            // 提取ETH
            (bool success, ) = payable(owner()).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // 提取ERC20代币
            IERC20(token).safeTransfer(owner(), amount);
        }
        
        emit FundsWithdrawn(token, amount, block.timestamp);
    }
    
    /**
     * @dev 更新防御线价格
     * @notice 根据当前市场价格重新计算防御线价格
     */
    function updateDefenseLinePrice() external {
        _updateDefenseLinePrice();
    }
    
    // =========================== 内部函数 ===========================
    
    /**
     * @dev 获取当前ETH价格（内部函数）
     * @return 当前ETH价格（美元，8位小数）
     */
    function _getCurrentETHPrice() internal view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price from oracle");
        return uint256(price);
    }
    
    /**
     * @dev 更新防御线价格（内部函数）
     */
    function _updateDefenseLinePrice() internal {
        uint256 currentPrice = _getCurrentETHPrice();
        currentDefensePrice = (currentPrice * DEFENSE_RATIO) / PRECISION;
    }
    
    /**
     * @dev 执行Uniswap V3交易（内部函数）
     * @param amountIn 输入数量
     * @param path 交易路径
     * @return amountOut 输出数量
     * @notice 简化实现，实际需要与Uniswap V3路由器交互[citation:10]
     */
    function _executeSwap(uint256 amountIn, bytes memory path) internal returns (uint256) {
        // 此处为简化实现，实际需要调用Uniswap V3路由器的exactInputSingle函数[citation:10]
        // 实际实现需要导入ISwapRouter接口并调用相应函数
        
        // 模拟交易：假设1 USDC = 0.0005 ETH（简化计算）
        // 实际应该从Uniswap获取实时价格
        uint256 ethAmount = (amountIn * 5) / 10000; // 简化换算
        
        // 验证收到ETH
        require(ethAmount > 0, "No ETH received from swap");
        
        return ethAmount;
    }
    
    /**
     * @dev 计算用户ETH份额（内部函数）
     */
    function _calculateUserShares() internal {
        if (totalUsdcDeposited == 0 || totalEthBalance == 0) return;
        
        for (uint256 i = 0; i < depositors.length; i++) {
            address user = depositors[i];
            UserInfo storage userInfo_ = userInfo[user];
            
            if (userInfo_.usdcAmount > 0 && !userInfo_.hasWithdrawn) {
                userInfo_.ethShare = (userInfo_.usdcAmount * totalEthBalance) / totalUsdcDeposited;
            }
        }
    }
    
    // =========================== 接收ETH函数 ===========================
    
    /**
     * @dev 接收ETH的回退函数
     */
    receive() external payable {}
    
    /**
     * @dev 接收ETH的fallback函数
     */
    fallback() external payable {}
}